export default {
  routes: [
    {
      method: 'GET',
      path: '/discussions/slug/:slug',
      handler: 'api::discussion.discussion.findBySlug',
    },
  ],
};
