import type { Core } from '@strapi/strapi';
import type MemberService from '../services/member';

type Service = ReturnType<typeof MemberService>;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /api/members/:username
  async findOne(ctx: { params: { username: string } }) {
    const service = strapi.service('api::member.member') as unknown as Service;
    return { data: await service.findPublicProfile(ctx.params.username) };
  },
});
