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
}));
