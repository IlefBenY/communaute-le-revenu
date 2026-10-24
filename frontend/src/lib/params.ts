import type { DiscussionListParams, SortKey } from './strapi/types';

type RawSearchParams = Record<string, string | string[] | undefined>;

const SORTS: SortKey[] = ['recent', 'oldest', 'popular'];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Normalise les paramètres d'URL de la liste (valeurs inconnues ignorées). */
export function parseListParams(raw: RawSearchParams): DiscussionListParams {
  const sort = first(raw.sort) as SortKey | undefined;
  const page = Number(first(raw.page));
  return {
    category: first(raw.category),
    q: first(raw.q)?.slice(0, 100),
    sort: sort && SORTS.includes(sort) ? sort : 'recent',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
