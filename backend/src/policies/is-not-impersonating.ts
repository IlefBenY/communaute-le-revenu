import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * Refuse toute tentative de publier au nom d'un autre utilisateur (403).
 * PolicyError (sous-classe de ForbiddenError) est la seule erreur 403 dont Strapi conserve le message.
 * Le controller force de toute façon l'auteur à `ctx.state.user` : cette policy
 * rend la tentative explicite au lieu de l'ignorer silencieusement.
 */
const isNotImpersonating: Core.PolicyHandler = (policyContext) => {
  const user = (policyContext as unknown as { state: { user?: { id: number; documentId: string } } }).state.user;
  const body = policyContext.request.body as { data?: { author?: unknown } } | undefined;
  const author = body?.data?.author;

  if (author === undefined || author === null) return true;

  const claimed = typeof author === 'object' ? (author as { id?: unknown; documentId?: unknown }) : { id: author, documentId: author };
  const matches = String(claimed.id) === String(user?.id) || claimed.documentId === user?.documentId;

  if (!matches) {
    throw new errors.PolicyError("Vous ne pouvez pas publier au nom d'un autre utilisateur.");
  }
  return true;
};

export default isNotImpersonating;
