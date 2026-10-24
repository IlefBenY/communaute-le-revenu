import Link from 'next/link';
import type { DiscussionListParams, Pagination as PaginationMeta, SortKey } from '@/lib/strapi/types';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'popular', label: 'Plus de réponses' },
];

/** Construit l'URL de la liste en conservant les filtres courants (état porté par l'URL). */
export const listHref = (params: DiscussionListParams, patch: Partial<DiscussionListParams>) => {
  const next = { ...params, ...patch };
  const qs = new URLSearchParams();
  if (next.category) qs.set('category', next.category);
  if (next.q) qs.set('q', next.q);
  if (next.sort && next.sort !== 'recent') qs.set('sort', next.sort);
  if (next.page && next.page > 1) qs.set('page', String(next.page));
  const s = qs.toString();
  return s ? `/?${s}` : '/';
};

export function SortTabs({ params }: { params: DiscussionListParams }) {
  const current = params.sort ?? 'recent';
  return (
    <nav aria-label="Trier les discussions" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
      {SORT_OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={listHref(params, { sort: o.value, page: 1 })}
          aria-current={current === o.value ? 'page' : undefined}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink aria-[current=page]:bg-fill aria-[current=page]:text-ink"
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({ params, pagination }: { params: DiscussionListParams; pagination: PaginationMeta }) {
  const { page, pageCount } = pagination;
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link className="btn-secondary" href={listHref(params, { page: page - 1 })}>
          ← Précédent
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-3">
        Page {page} sur {pageCount}
      </span>
      {page < pageCount ? (
        <Link className="btn-secondary" href={listHref(params, { page: page + 1 })}>
          Suivant →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
