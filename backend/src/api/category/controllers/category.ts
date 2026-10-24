import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const UID = 'api::category.category';
const FIELDS = ['name', 'slug', 'description', 'color'] as ('name' | 'slug' | 'description' | 'color')[];

type CategoryEntity = { id: number | string; documentId: string; name?: string | null; slug?: string | null; description?: string | null; color?: string | null };

const toDTO = (c: CategoryEntity) => ({
  id: c.id,
  documentId: c.documentId,
  name: c.name ?? '',
  slug: c.slug ?? '',
  description: c.description ?? null,
  color: c.color ?? null,
});

/**
 * Lecture seule et forme de réponse figée : les paramètres `populate`/`fields` du client
 * sont ignorés, pour ne jamais exposer les discussions brutes via la relation inverse.
 */
export default factories.createCoreController(UID, ({ strapi }) => ({
  async find() {
    const categories = await strapi.documents(UID).findMany({ fields: FIELDS, sort: ['name:asc'], limit: 100 });
    return { data: categories.map(toDTO), meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: categories.length } } };
  },

  async findOne(ctx) {
    const category = await strapi.documents(UID).findOne({ documentId: ctx.params.id, fields: FIELDS });
    if (!category) throw new errors.NotFoundError('Catégorie introuvable.');
    return { data: toDTO(category) };
  },
}));
