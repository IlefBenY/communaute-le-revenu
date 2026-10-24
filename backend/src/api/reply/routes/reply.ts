import { factories } from '@strapi/strapi';

// Les réponses sont lues via le détail d'une discussion : seule la création est exposée.
export default factories.createCoreRouter('api::reply.reply', {
  only: ['create'],
  config: {
    create: {
      policies: ['global::is-authenticated', 'global::is-not-impersonating'],
    },
  },
});
