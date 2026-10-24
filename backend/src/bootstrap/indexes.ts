import type { Core } from '@strapi/strapi';

/**
 * Index complémentaires pour les requêtes de liste (tri par date / popularité).
 * Les tables de liaison des relations sont déjà indexées par Strapi.
 */
export async function ensureIndexes(strapi: Core.Strapi) {
  const knex = strapi.db.connection;
  await knex.raw('CREATE INDEX IF NOT EXISTS discussions_created_at_idx ON discussions (created_at)');
  await knex.raw('CREATE INDEX IF NOT EXISTS discussions_replies_count_idx ON discussions (replies_count)');
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS discussions_slug_uq ON discussions (slug)');
  // Un seul vote « Utile » par membre et par réponse (clé « voter:reply »).
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS votes_key_uq ON votes (key)');
}
