import { factories } from '@strapi/strapi';

// Pas de route publique : les votes sont gérés par le service des réponses.
export default factories.createCoreService('api::vote.vote');
