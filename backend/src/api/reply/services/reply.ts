import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { toAuthor } from '../../../utils/serializers';
import type { DiscussionService } from '../../discussion/services/discussion';
import type { CreateReplyInput } from '../validation';

const UID = 'api::reply.reply';
const VOTE = 'api::vote.vote';

const isUniqueViolation = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === '23505' || e?.cause?.code === '23505' || /unique/i.test(e?.message ?? '');
};

const replyService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** L'auteur est toujours l'utilisateur authentifié. */
  async createForAuthor(input: CreateReplyInput, authorDocumentId: string) {
    const discussion = await strapi
      .documents('api::discussion.discussion')
      .findOne({ documentId: input.discussion, fields: ['slug'] });
    if (!discussion) throw new errors.NotFoundError('Discussion introuvable.');

    const reply = await strapi.documents(UID).create({
      data: { content: input.content, discussion: discussion.documentId, author: authorDocumentId },
      populate: { author: { fields: ['username'] } },
    });

    const discussions = strapi.service('api::discussion.discussion') as unknown as DiscussionService;
    await discussions.refreshRepliesCount(discussion.documentId);

    return {
      id: reply.id,
      documentId: reply.documentId,
      content: reply.content,
      createdAt: reply.createdAt,
      author: toAuthor(reply.author as { id: number; documentId: string; username: string } | null),
      // Permet au front d'invalider le bon cache sans faire confiance à une valeur du formulaire.
      discussion: { documentId: discussion.documentId, slug: discussion.slug },
    };
  },

  /**
   * Ajoute ou retire le vote « Utile » de l'utilisateur sur une réponse.
   * Unicité garantie par la clé `voter:reply` (index unique en base) : un double clic
   * simultané ne crée jamais deux votes.
   */
  async toggleUseful(replyDocumentId: string, voterDocumentId: string) {
    const reply = await strapi.documents(UID).findOne({
      documentId: replyDocumentId,
      fields: ['id'],
      populate: { discussion: { fields: ['slug'] } },
    });
    if (!reply) throw new errors.NotFoundError('Réponse introuvable.');

    const key = `${voterDocumentId}:${replyDocumentId}`;
    const existing = await strapi.documents(VOTE).findFirst({ filters: { key }, fields: ['key'] });

    let voted: boolean;
    if (existing) {
      await strapi.documents(VOTE).delete({ documentId: existing.documentId });
      voted = false;
    } else {
      try {
        await strapi.documents(VOTE).create({ data: { key, voter: voterDocumentId, reply: replyDocumentId } });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
      voted = true;
    }

    const usefulCount = await strapi.documents(VOTE).count({ filters: { reply: { documentId: replyDocumentId } } });
    await strapi.db.query(UID).updateMany({ where: { documentId: replyDocumentId }, data: { usefulCount } });

    const discussion = reply.discussion as { documentId: string; slug: string } | null;
    return {
      reply: replyDocumentId,
      usefulCount,
      voted,
      discussion: discussion ? { documentId: discussion.documentId, slug: discussion.slug } : null,
    };
  },

  /** Réponses d'une discussion que l'utilisateur a marquées « Utile ». */
  async myUseful(discussionDocumentId: string, voterDocumentId: string) {
    const votes = await strapi.documents(VOTE).findMany({
      filters: { voter: { documentId: voterDocumentId }, reply: { discussion: { documentId: discussionDocumentId } } },
      fields: ['key'],
      populate: { reply: { fields: ['id'] } },
      limit: 500,
    });
    return votes.map((v) => (v.reply as { documentId: string }).documentId);
  },
});

export type ReplyService = ReturnType<typeof replyService>;

export default factories.createCoreService(UID, replyService);
