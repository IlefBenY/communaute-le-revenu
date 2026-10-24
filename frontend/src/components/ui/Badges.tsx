import Link from 'next/link';
import type { CategoryRef, DiscussionType } from '@/lib/strapi/types';

export function CategoryBadge({ category }: { category: CategoryRef }) {
  return (
    <Link
      href={`/?category=${category.slug}`}
      className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:underline"
    >
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: category.color ?? 'currentColor' }} />
      {category.name}
    </Link>
  );
}

export function TypeBadge({ type }: { type: DiscussionType }) {
  return (
    <span className="rounded-md bg-fill px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
      {type === 'question' ? 'Question' : 'Discussion'}
    </span>
  );
}
