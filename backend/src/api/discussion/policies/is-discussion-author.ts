import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

type AsyncPolicy = (policyContext: Core.PolicyContext, config: unknown, deps: { strapi: Core.Strapi }) => Promise<boolean>;
type Ctx = { state: { user?: { documentId: string } }; params: { id: string } };

/** Seul l'auteur de la discussion peut choisir (ou retirer) la meilleure réponse. */
const isDiscussionAuthor: AsyncPolicy = async (policyContext, _config, { strapi }) => {
  const { state, params } = policyContext as unknown as Ctx;
  const discussion = await strapi
    .documents('api::discussion.discussion')
    .findOne({ documentId: params.id, fields: ['id'], populate: { author: { fields: ['id'] } } });

  if (!discussion) throw new errors.NotFoundError('Discussion introuvable.');
  if ((discussion.author as { documentId?: string } | null)?.documentId !== state.user?.documentId) {
    throw new errors.PolicyError("Seul l'auteur de la discussion peut choisir la meilleure réponse.");
  }
  return true;
};

export default isDiscussionAuthor;
