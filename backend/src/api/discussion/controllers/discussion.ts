import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { DiscussionService } from '../services/discussion';
import { validateCreateDiscussion, validateListQuery } from '../validation';

const UID = 'api::discussion.discussion';

export default factories.createCoreController(UID, ({ strapi }) => {
  const service = () => strapi.service(UID) as unknown as DiscussionService;

  return {
    // GET /api/discussions?category=bourse&sort=recent&page=1&pageSize=10&q=pea
    async find(ctx) {
      const params = await validateListQuery(ctx.query as Record<string, unknown>);
      const { results, pagination } = await service().findPublicList(params);
      return { data: results, meta: { pagination } };
    },

    // GET /api/discussions/:id (documentId)
    async findOne(ctx) {
      return { data: await service().findPublicOne({ documentId: ctx.params.id }) };
    },

    // GET /api/discussions/slug/:slug
    async findBySlug(ctx) {
      return { data: await service().findPublicOne({ slug: ctx.params.slug }) };
    },

    // POST /api/discussions
    async create(ctx) {
      const user = ctx.state.user;
      if (!user) throw new errors.UnauthorizedError('Vous devez être connecté pour publier.');

      const body = ctx.request.body as { data?: unknown } | undefined;
      const input = await validateCreateDiscussion(body?.data);
      const discussion = await service().createForAuthor(input, user.documentId);

      ctx.status = 201;
      return { data: discussion };
    },

    // PUT /api/discussions/:id/best-reply  { data: { reply: "<documentId>" | null } }
    async setBestReply(ctx) {
      const body = ctx.request.body as { data?: { reply?: unknown } } | undefined;
      const reply = body?.data?.reply;
      if (reply !== null && typeof reply !== 'string') {
        throw new errors.ValidationError("Le champ « reply » doit être l'identifiant d'une réponse ou null.");
      }
      return { data: await service().setBestReply(ctx.params.id, reply || null) };
    },
  };
});
