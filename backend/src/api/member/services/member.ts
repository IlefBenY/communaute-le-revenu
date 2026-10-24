import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { excerpt, toCategory } from '../../../utils/serializers';

type DiscussionRow = {
  documentId: string;
  title: string;
  slug: string;
  type: 'question' | 'discussion';
  repliesCount?: number | null;
  createdAt: string | Date;
  category?: { documentId: string; name: string; slug: string; color?: string | null } | null;
  bestReply?: { documentId: string } | null;
};
type ReplyRow = {
  documentId: string;
  content: string;
  usefulCount?: number | null;
  createdAt: string | Date;
  discussion?: { documentId: string; title: string; slug: string } | null;
};

const LIMIT = 10;

/** Profil public d'un membre : jamais d'e-mail ni de données de compte. */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findPublicProfile(username: string) {
    const user = await strapi
      .documents('plugin::users-permissions.user')
      .findFirst({ filters: { username: { $eqi: username }, blocked: { $ne: true } }, fields: ['username', 'createdAt'] });
    if (!user) throw new errors.NotFoundError('Membre introuvable.');

    const byAuthor = { author: { documentId: user.documentId } };
    const [discussions, replies, discussionsCount, repliesCount, bestAnswers, usefulVotes] = await Promise.all([
      strapi.documents('api::discussion.discussion').findMany({
        filters: byAuthor,
        fields: ['title', 'slug', 'type', 'repliesCount', 'createdAt'],
        populate: { category: { fields: ['name', 'slug', 'color'] }, bestReply: { fields: ['id'] } },
        sort: ['createdAt:desc'],
        limit: LIMIT,
      }),
      strapi.documents('api::reply.reply').findMany({
        filters: byAuthor,
        fields: ['content', 'usefulCount', 'createdAt'],
        populate: { discussion: { fields: ['title', 'slug'] } },
        sort: ['createdAt:desc'],
        limit: LIMIT,
      }),
      strapi.documents('api::discussion.discussion').count({ filters: byAuthor }),
      strapi.documents('api::reply.reply').count({ filters: byAuthor }),
      strapi.documents('api::discussion.discussion').count({ filters: { bestReply: byAuthor } }),
      strapi.documents('api::vote.vote').count({ filters: { reply: byAuthor } }),
    ]);

    return {
      username: user.username,
      memberSince: user.createdAt,
      stats: { discussions: discussionsCount, replies: repliesCount, bestAnswers, usefulReceived: usefulVotes },
      discussions: (discussions as unknown as DiscussionRow[]).map((d) => ({
        documentId: d.documentId,
        title: d.title,
        slug: d.slug,
        type: d.type,
        repliesCount: d.repliesCount ?? 0,
        solved: Boolean(d.bestReply),
        publishedAt: d.createdAt,
        category: toCategory(d.category),
      })),
      replies: (replies as unknown as ReplyRow[]).map((r) => ({
        documentId: r.documentId,
        excerpt: excerpt(r.content, 160),
        usefulCount: r.usefulCount ?? 0,
        createdAt: r.createdAt,
        discussion: r.discussion ? { title: r.discussion.title, slug: r.discussion.slug } : null,
      })),
    };
  },
});
