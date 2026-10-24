import type { DiscussionSummary } from '@/lib/strapi/types';

export const makeDiscussion = (overrides: Partial<DiscussionSummary> = {}): DiscussionSummary => ({
  id: 1,
  documentId: 'doc-1',
  title: 'Ouvrir un PEA avec 5 000 € : par où commencer ?',
  slug: 'ouvrir-un-pea-avec-5-000-eur-par-ou-commencer',
  type: 'question',
  excerpt: 'Je viens d’ouvrir un PEA en ligne…',
  repliesCount: 4,
  solved: false,
  publishedAt: '2026-10-22T09:03:01.028Z',
  author: { id: 11, documentId: 'u-11', username: 'Thomas_PEA' },
  category: { documentId: 'c-1', name: 'Bourse & actions', slug: 'bourse', color: '#007aff' },
  ...overrides,
});
