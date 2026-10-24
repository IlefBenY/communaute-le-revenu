import { Client } from 'pg';

/**
 * Les tests d'API tournent sur une base PostgreSQL dédiée, recréée à chaque exécution :
 * même moteur qu'en production, aucune donnée de développement touchée.
 */
export default async function globalSetup() {
  require('dotenv').config();
  const database = process.env.DATABASE_TEST_NAME || 'communaute_test';
  process.env.DATABASE_NAME = database;

  const client = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi',
    database: 'postgres',
  });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${database}"`);
  await client.end();
}
