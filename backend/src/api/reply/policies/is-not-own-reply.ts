import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

type AsyncPolicy = (policyContext: Core.PolicyContext, config: unknown, deps: { strapi: Core.Strapi }) => Promise<boolean>;
type Ctx = { state: { user?: { documentId: string } }; params: { id: string } };

/** Un membre ne peut pas marquer sa propre réponse comme « Utile ». */
const isNotOwnReply: AsyncPolicy = async (policyContext, _config, { strapi }) => {
  const { state, params } = policyContext as unknown as Ctx;
  const reply = await strapi
    .documents('api::reply.reply')
    .findOne({ documentId: params.id, fields: ['id'], populate: { author: { fields: ['id'] } } });

  if (!reply) throw new errors.NotFoundError('Réponse introuvable.');
  if ((reply.author as { documentId?: string } | null)?.documentId === state.user?.documentId) {
    throw new errors.PolicyError('Vous ne pouvez pas voter pour votre propre réponse.');
  }
  return true;
};

export default isNotOwnReply;
