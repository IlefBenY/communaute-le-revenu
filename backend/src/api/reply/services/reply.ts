import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { toAuthor } from '../../../utils/serializers';
import type { DiscussionService } from '../../discussion/services/discussion';
import type { CreateReplyInput } from '../validation';

const UID = 'api::reply.reply';

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
});

export type ReplyService = ReturnType<typeof replyService>;

export default factories.createCoreService(UID, replyService);
