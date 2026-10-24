import type { Core } from '@strapi/strapi';

const READ = [
  'api::category.category.find',
  'api::category.category.findOne',
  'api::discussion.discussion.find',
  'api::discussion.discussion.findOne',
  'api::discussion.discussion.findBySlug',
];
const WRITE = ['api::discussion.discussion.create', 'api::reply.reply.create'];

/** Permissions attendues par rôle Users & Permissions. Le reste est fermé par défaut. */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  public: READ,
  authenticated: [...READ, ...WRITE],
};

/**
 * Applique les permissions au démarrage (idempotent) : la configuration des droits
 * est versionnée avec le code au lieu de dépendre d'un clic dans l'admin.
 */
export async function syncPermissions(strapi: Core.Strapi) {
  for (const [type, actions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } });
    if (!role) continue;

    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findMany({ where: { role: role.id, action: { $in: actions } } });
    const granted = new Set(existing.map((p: { action: string }) => p.action));

    for (const action of actions.filter((a) => !granted.has(a))) {
      await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    }
  }
}
