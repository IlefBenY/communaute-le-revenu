import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { StrapiError, strapiFetch } from './client';
import type { Category, DiscussionDetail, DiscussionListParams, DiscussionSummary, Member, Paginated, Single } from './types';

/**
 * Lectures publiques, mises en cache par Next.js et invalidées par tag
 * après une mutation (voir app/actions). Aucune donnée liée à l'utilisateur ici.
 */
export const TAGS = {
  categories: 'categories',
  discussions: 'discussions',
  discussion: (slug: string) => `discussion:${slug}`,
};

export async function getCategories() {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.categories);

  const res = await strapiFetch<Paginated<Category>>('/api/categories', {
    query: { 'pagination[pageSize]': 100 },
  });
  // Tri alphabétique français (« Économie » avec les E, pas après le Z).
  return res.data.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function getDiscussions(params: DiscussionListParams) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.discussions);

  return strapiFetch<Paginated<DiscussionSummary>>('/api/discussions', {
    query: { ...params, pageSize: params.pageSize ?? 10 },
  });
}

export async function getDiscussionBySlug(slug: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.discussions, TAGS.discussion(slug));

  try {
    const res = await strapiFetch<Single<DiscussionDetail>>(`/api/discussions/slug/${encodeURIComponent(slug)}`);
    return res.data;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}

export async function getMember(username: string) {
  'use cache';
  cacheLife('minutes');
  // Le profil agrège discussions, réponses et votes : invalidé avec le tag des discussions.
  cacheTag(TAGS.discussions);

  try {
    const res = await strapiFetch<Single<Member>>(`/api/members/${encodeURIComponent(username)}`);
    return res.data;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}
