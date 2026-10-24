export default {
  routes: [
    {
      method: 'POST',
      path: '/replies/:id/useful',
      handler: 'api::reply.reply.toggleUseful',
      config: { policies: ['global::is-authenticated', 'api::reply.is-not-own-reply'] },
    },
    {
      method: 'GET',
      path: '/replies/useful/mine',
      handler: 'api::reply.reply.myUseful',
      config: { policies: ['global::is-authenticated'] },
    },
  ],
};
