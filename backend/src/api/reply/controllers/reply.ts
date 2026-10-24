import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { ReplyService } from '../services/reply';
import { validateCreateReply } from '../validation';

const UID = 'api::reply.reply';

export default factories.createCoreController(UID, ({ strapi }) => ({
  // POST /api/replies  { data: { discussion: "<documentId>", content: "..." } }
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) throw new errors.UnauthorizedError('Vous devez être connecté pour répondre.');

    const body = ctx.request.body as { data?: unknown } | undefined;
    const input = await validateCreateReply(body?.data);
    const reply = await (strapi.service(UID) as unknown as ReplyService).createForAuthor(input, user.documentId);

    ctx.status = 201;
    return { data: reply };
  },

  // POST /api/replies/:id/useful  → ajoute ou retire le vote « Utile »
  async toggleUseful(ctx) {
    const user = ctx.state.user;
    if (!user) throw new errors.UnauthorizedError('Vous devez être connecté pour voter.');
    const service = strapi.service(UID) as unknown as ReplyService;
    return { data: await service.toggleUseful(ctx.params.id, user.documentId) };
  },

  // GET /api/replies/useful/mine?discussion=<documentId>
  async myUseful(ctx) {
    const user = ctx.state.user;
    if (!user) throw new errors.UnauthorizedError();
    const discussion = typeof ctx.query.discussion === 'string' ? ctx.query.discussion : '';
    if (!discussion) throw new errors.ValidationError('Le paramètre « discussion » est obligatoire.');
    const service = strapi.service(UID) as unknown as ReplyService;
    return { data: await service.myUseful(discussion, user.documentId) };
  },
}));
