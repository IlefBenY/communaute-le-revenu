import type { Core, Modules } from '@strapi/strapi';
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { slugify } from '../../../utils/slugify';
import { excerpt, toAuthor, toCategory } from '../../../utils/serializers';
import { SORTS, type CreateDiscussionInput, type ListQuery } from '../validation';

const UID = 'api::discussion.discussion';

// Relations récupérées en une seule requête, en ne sélectionnant que les colonnes utiles.
type Populate = Modules.Documents.Params.Populate.Any<typeof UID>;

const LIST_POPULATE = {
  author: { fields: ['username'] },
  category: { fields: ['name', 'slug', 'color'] },
  bestReply: { fields: ['id'] },
} satisfies Populate;

type Row = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  type: 'question' | 'discussion';
  content?: string;
  repliesCount?: number | null;
  createdAt?: string | Date;
  author?: { id: number; documentId: string; username: string } | null;
  category?: { documentId: string; name: string; slug: string; color?: string | null } | null;
  replies?: {
    id: number;
    documentId: string;
    content: string;
    usefulCount?: number | null;
    createdAt: string | Date;
    author?: Row['author'];
  }[];
  bestReply?: { documentId: string } | null;
};

/**
 * Date de publication = date de création. Draft & Publish étant désactivé, `publishedAt` est
 * réécrit à chaque mise à jour (même depuis l'admin) ; `createdAt` est immuable.
 */
const toListItem = (d: Row) => ({
  id: d.id,
  documentId: d.documentId,
  title: d.title,
  slug: d.slug,
  type: d.type,
  excerpt: excerpt(d.content ?? ''),
  repliesCount: d.repliesCount ?? 0,
  solved: Boolean(d.bestReply),
  publishedAt: d.createdAt,
  author: toAuthor(d.author),
  category: toCategory(d.category),
});

const toDetail = (d: Row) => ({
  ...toListItem(d),
  content: d.content ?? '',
  bestReply: d.bestReply?.documentId ?? null,
  replies: (d.replies ?? []).map((r) => ({
    id: r.id,
    documentId: r.documentId,
    content: r.content,
    usefulCount: r.usefulCount ?? 0,
    createdAt: r.createdAt,
    author: toAuthor(r.author),
  })),
});

const DETAIL_POPULATE = {
  ...LIST_POPULATE,
  replies: {
    fields: ['content', 'usefulCount', 'createdAt'],
    sort: ['createdAt:asc', 'id:asc'],
    populate: { author: { fields: ['username'] } },
  },
} satisfies Populate;

/** Violation d'unicité PostgreSQL (code 23505), éventuellement enveloppée par Strapi. */
const isUniqueViolation = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === '23505' || e?.cause?.code === '23505' || /unique/i.test(e?.message ?? '');
};

const discussionService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async findPublicList({ category, q, sort, page, pageSize }: ListQuery) {
    const filters = {
      ...(category && { category: { slug: { $eq: category } } }),
      ...(q && { $or: [{ title: { $containsi: q } }, { content: { $containsi: q } }] }),
    };

    const [results, total] = await Promise.all([
      strapi.documents(UID).findMany({
        filters,
        sort: [...SORTS[sort]],
        fields: ['title', 'slug', 'type', 'content', 'repliesCount', 'createdAt'],
        populate: LIST_POPULATE,
        start: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.documents(UID).count({ filters }),
    ]);

    return {
      results: (results as unknown as Row[]).map(toListItem),
      pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total },
    };
  },

  async findPublicOne(where: { documentId: string } | { slug: string }) {
    const discussion = await strapi.documents(UID).findFirst({ filters: where, populate: DETAIL_POPULATE });
    if (!discussion) throw new errors.NotFoundError('Discussion introuvable.');
    return toDetail(discussion as unknown as Row);
  },

  async uniqueSlug(title: string) {
    const base = slugify(title);
    let candidate = base;
    for (let i = 2; await strapi.documents(UID).count({ filters: { slug: candidate } }); i++) {
      candidate = `${base}-${i}`;
    }
    return candidate;
  },

  /**
   * Création d'une discussion : l'auteur est TOUJOURS l'utilisateur authentifié,
   * jamais une valeur fournie par le client.
   */
  async createForAuthor(input: CreateDiscussionInput, authorDocumentId: string) {
    const category = await strapi
      .documents('api::category.category')
      .findFirst({ filters: { slug: input.category }, fields: ['slug'] });
    if (!category) {
      throw new errors.ValidationError("La catégorie sélectionnée n'existe pas.", {
        errors: [{ path: ['category'], message: "La catégorie sélectionnée n'existe pas.", name: 'ValidationError' }],
      });
    }

    const create = (slug: string) =>
      strapi.documents(UID).create({
        data: {
          title: input.title,
          slug,
          content: input.content,
          type: input.type as Row['type'],
          repliesCount: 0,
          category: category.documentId,
          author: authorDocumentId,
        },
        populate: LIST_POPULATE,
      });

    // Le slug est vérifié puis inséré : deux créations simultanées du même titre peuvent
    // entrer en collision sur l'index unique. On réessaie alors avec un suffixe aléatoire.
    let slug = await this.uniqueSlug(input.title);
    for (let attempt = 0; ; attempt++) {
      try {
        const created = await create(slug);
        return toDetail({ ...(created as unknown as Row), replies: [] });
      } catch (error) {
        if (!isUniqueViolation(error) || attempt >= 2) throw error;
        slug = `${slugify(input.title, 70)}-${Math.random().toString(36).slice(2, 7)}`;
      }
    }
  },

  /**
   * Choisit (ou retire, avec `null`) la meilleure réponse. La réponse doit appartenir
   * à la discussion ; le droit de le faire est vérifié par la policy is-discussion-author.
   */
  async setBestReply(discussionDocumentId: string, replyDocumentId: string | null) {
    const discussion = await strapi.documents(UID).findOne({ documentId: discussionDocumentId, fields: ['slug'] });
    if (!discussion) throw new errors.NotFoundError('Discussion introuvable.');

    if (replyDocumentId) {
      const belongs = await strapi.documents('api::reply.reply').count({
        filters: { documentId: replyDocumentId, discussion: { documentId: discussionDocumentId } },
      });
      if (!belongs) {
        throw new errors.ValidationError("Cette réponse n'appartient pas à la discussion.", {
          errors: [{ path: ['reply'], message: "Cette réponse n'appartient pas à la discussion.", name: 'ValidationError' }],
        });
      }
    }

    await strapi.documents(UID).update({ documentId: discussionDocumentId, data: { bestReply: replyDocumentId } });
    return { documentId: discussionDocumentId, slug: discussion.slug, bestReply: replyDocumentId };
  },

  /**
   * Recalcule le compteur dénormalisé utilisé pour l'affichage et le tri.
   * Passe par la Query Engine pour ne pas déclencher la logique de publication du Document Service.
   */
  async refreshRepliesCount(discussionDocumentId: string) {
    const repliesCount = await strapi
      .documents('api::reply.reply')
      .count({ filters: { discussion: { documentId: discussionDocumentId } } });
    await strapi.db.query(UID).updateMany({ where: { documentId: discussionDocumentId }, data: { repliesCount } });
    return repliesCount;
  },
});

export type DiscussionService = ReturnType<typeof discussionService>;

export default factories.createCoreService(UID, discussionService);
