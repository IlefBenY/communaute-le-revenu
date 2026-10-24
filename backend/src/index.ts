import type { Core } from '@strapi/strapi';
import { ensureIndexes } from './bootstrap/indexes';
import { syncPermissions } from './bootstrap/permissions';
import { seedDemoData } from './bootstrap/seed';

export default {
  register() {
    // Les colonnes Strapi sont en `timestamp without time zone` et le driver `pg` écrit les
    // dates dans le fuseau du processus : on fixe UTC pour un stockage identique quel que
    // soit l'environnement (poste local, conteneur, CI). L'affichage reste en Europe/Paris.
    process.env.TZ = 'UTC';
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureIndexes(strapi);
    await syncPermissions(strapi);
    await seedDemoData(strapi);
  },
};
