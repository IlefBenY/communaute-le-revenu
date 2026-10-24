export default {
  routes: [
    {
      method: 'GET',
      path: '/discussions/slug/:slug',
      handler: 'api::discussion.discussion.findBySlug',
    },
    {
      method: 'PUT',
      path: '/discussions/:id/best-reply',
      handler: 'api::discussion.discussion.setBestReply',
      config: { policies: ['global::is-authenticated', 'api::discussion.is-discussion-author'] },
    },
  ],
};
