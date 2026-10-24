import fs from 'node:fs/promises';
import path from 'node:path';
import type { Core } from '@strapi/strapi';
import { slugify } from '../utils/slugify';

type SeedCategory = { slug: string; name: string; description: string; color: string };
type SeedUser = { username: string; email: string };
type SeedDiscussion = {
  category: string;
  type: 'question' | 'discussion';
  author: string;
  minutesAgo: number;
  title: string;
  content: string;
  /** Index de la meilleure réponse dans `replies`, ou null. */
  bestReply: number | null;
  replies: { author: string; content: string; useful: number }[];
};

export const DEMO_PASSWORD = 'Demo1234!';

const readSeed = async <T>(strapi: Core.Strapi, file: string): Promise<T> =>
  JSON.parse(await fs.readFile(path.join(strapi.dirs.app.root, 'data', 'seed', file), 'utf8'));

/**
 * Initialise les données de démonstration si la base est vide (idempotent).
 * Désactivable avec SEED_DEMO_DATA=false.
 */
export async function seedDemoData(strapi: Core.Strapi) {
  if (process.env.SEED_DEMO_DATA === 'false') return;
  if ((await strapi.documents('api::category.category').count({})) > 0) return;

  strapi.log.info('[seed] Base vide : insertion des données de démonstration…');

  const categories = await readSeed<SeedCategory[]>(strapi, 'categories.json');
  const users = await readSeed<SeedUser[]>(strapi, 'users.json');
  const discussions = await readSeed<SeedDiscussion[]>(strapi, 'discussions.json');

  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const created = await strapi.documents('api::category.category').create({ data: c });
    categoryIds.set(c.slug, created.documentId);
  }

  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const userIds = new Map<string, string>();
  for (const u of users) {
    // Le service du plugin hash le mot de passe.
    const created = await strapi.plugin('users-permissions').service('user').add({
      ...u,
      password: DEMO_PASSWORD,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: role.id,
    });
    userIds.set(u.username, created.documentId);
  }

  const now = Date.now();
  for (const d of discussions) {
    const publishedAt = new Date(now - d.minutesAgo * 60_000);
    const discussion = await strapi.documents('api::discussion.discussion').create({
      data: {
        title: d.title,
        slug: slugify(d.title),
        content: d.content,
        type: d.type,
        repliesCount: d.replies.length,
        category: categoryIds.get(d.category),
        author: userIds.get(d.author),
      },
    });
    // Dates réalistes pour que le tri par date de publication ait du sens.
    await strapi.db
      .query('api::discussion.discussion')
      .update({ where: { id: discussion.id }, data: { publishedAt, createdAt: publishedAt } });

    const replyIds: string[] = [];
    for (const [i, r] of d.replies.entries()) {
      const reply = await strapi.documents('api::reply.reply').create({
        data: { content: r.content, discussion: discussion.documentId, author: userIds.get(r.author) },
      });
      const createdAt = new Date(publishedAt.getTime() + (i + 1) * 37 * 60_000);
      await strapi.db.query('api::reply.reply').update({ where: { id: reply.id }, data: { createdAt, publishedAt: createdAt } });
      replyIds.push(reply.documentId);

      // Votes « Utile » : environ un tiers des « J'aime » de la maquette, jamais par l'auteur de la réponse.
      const voters = users.map((u) => u.username).filter((u) => u !== r.author);
      const count = Math.min(Math.ceil(r.useful / 3), voters.length);
      for (let v = 0; v < count; v++) {
        const voter = userIds.get(voters[(i * 5 + v) % voters.length])!;
        await strapi.documents('api::vote.vote').create({
          data: { key: `${voter}:${reply.documentId}`, voter, reply: reply.documentId },
        });
      }
      await strapi.db.query('api::reply.reply').update({ where: { id: reply.id }, data: { usefulCount: count } });
    }

    if (d.bestReply !== null && replyIds[d.bestReply]) {
      await strapi
        .documents('api::discussion.discussion')
        .update({ documentId: discussion.documentId, data: { bestReply: replyIds[d.bestReply] } });
    }
  }

  strapi.log.info(
    `[seed] ${categories.length} catégories, ${users.length} utilisateurs (mot de passe : ${DEMO_PASSWORD}), ${discussions.length} discussions.`
  );
}
