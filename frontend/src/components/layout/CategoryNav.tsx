'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Category } from '@/lib/strapi/types';

/**
 * Composant client uniquement pour lire la catégorie active dans l'URL ;
 * les catégories elles-mêmes sont chargées côté serveur et passées en props.
 */
export function CategoryNav({ categories, variant }: { categories: Category[]; variant: 'sidebar' | 'pills' }) {
  const active = useSearchParams().get('category') ?? '';
  const items = [{ slug: '', name: 'Toutes les discussions', color: null as string | null }, ...categories];

  if (variant === 'pills') {
    return (
      <nav aria-label="Catégories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {items.map((c) => (
          <Link
            key={c.slug || 'all'}
            href={c.slug ? `/?category=${c.slug}` : '/'}
            aria-current={active === c.slug ? 'page' : undefined}
            className="whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-text"
          >
            {c.slug ? c.name : 'Toutes'}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Catégories">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-3">Espaces</p>
      <ul className="space-y-0.5">
        {items.map((c) => (
          <li key={c.slug || 'all'}>
            <Link
              href={c.slug ? `/?category=${c.slug}` : '/'}
              aria-current={active === c.slug ? 'page' : undefined}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-fill hover:text-ink aria-[current=page]:bg-fill aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: c.color ?? 'var(--brand)' }}
              />
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
