import { compileStrapi, createStrapi } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import request from 'supertest';

let instance: Core.Strapi | undefined;

/** Démarre une instance Strapi complète (bootstrap + seed) sur la base de test. */
export async function setupStrapi() {
  if (instance) return instance;
  process.env.DATABASE_NAME = process.env.DATABASE_TEST_NAME || 'communaute_test';

  const app = await compileStrapi();
  instance = await createStrapi({ ...app, autoReload: false, serveAdminPanel: false }).load();
  instance.server.mount();
  return instance;
}

export async function teardownStrapi() {
  if (!instance) return;
  await instance.destroy();
  instance = undefined;
}

export const api = () => request(instance!.server.httpServer);

export async function loginAs(identifier: string, password = 'Demo1234!') {
  const res = await api().post('/api/auth/local').send({ identifier, password }).expect(200);
  return res.body as { jwt: string; user: { id: number; documentId: string; username: string } };
}

export const getStrapi = () => instance!;
