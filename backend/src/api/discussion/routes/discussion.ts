import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::discussion.discussion', {
  only: ['find', 'findOne', 'create'],
  config: {
    create: {
      policies: ['global::is-authenticated', 'global::is-not-impersonating'],
    },
  },
});
