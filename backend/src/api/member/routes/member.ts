// API sans content type : le profil public est construit à partir des utilisateurs,
// discussions et réponses existants.
export default {
  routes: [
    {
      method: 'GET',
      path: '/members/:username',
      handler: 'api::member.member.findOne',
    },
  ],
};
