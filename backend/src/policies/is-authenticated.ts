import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * Défense en profondeur : même si la permission « create » était ouverte par erreur
 * au rôle Public dans l'admin, une écriture sans utilisateur authentifié est refusée (401).
 */
const isAuthenticated: Core.PolicyHandler = (policyContext) => {
  if (!(policyContext as unknown as { state: { user?: { id: number; documentId: string } } }).state.user) {
    throw new errors.UnauthorizedError('Vous devez être connecté pour publier.');
  }
  return true;
};

export default isAuthenticated;
