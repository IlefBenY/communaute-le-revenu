import Link from 'next/link';
import { AuthorLink } from '@/components/ui/AuthorLink';
import { CategoryBadge, TypeBadge } from '@/components/ui/Badges';
import { formatDate } from '@/lib/format';
import type { DiscussionSummary } from '@/lib/strapi/types';

/** Comme dans la maquette : vert si résolue, pointillés rouges si sans réponse. */
export function RepliesCounter({ count, solved = false }: { count: number; solved?: boolean }) {
  const tone = solved
    ? 'border-ok bg-ok-soft text-ok'
    : count === 0
      ? 'border-dashed border-brand/60 text-brand-text'
      : 'border-line text-ink';
  return (
    <div
      className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${tone}`}
      title={solved ? 'Résolue : une meilleure réponse a été choisie' : undefined}
    >
      <span className="text-lg font-semibold leading-none tabular-nums">{count}</span>
      <span className="mt-1 text-[10px] text-ink-3">{count > 1 ? 'réponses' : 'réponse'}</span>
    </div>
  );
}

export function DiscussionCard({ discussion }: { discussion: DiscussionSummary }) {
  const { title, slug, excerpt, type, repliesCount, solved, publishedAt, author, category } = discussion;

  return (
    <article className="relative flex gap-4 p-4 transition-colors hover:bg-fill/60 sm:p-5" data-testid="discussion-card">
      <RepliesCounter count={repliesCount} solved={solved} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {category && <CategoryBadge category={category} />}
          <TypeBadge type={type} />
          {solved && <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[11px] font-semibold text-ok">Résolue</span>}
        </div>
        <h2 className="mt-1 font-serif text-lg font-bold leading-snug text-ink sm:text-xl">
          {/* Lien étiré : toute la carte est cliquable, sans imbriquer de liens. */}
          <Link href={`/discussions/${slug}`} className="after:absolute after:inset-0 hover:underline">
            {title}
          </Link>
        </h2>
        {excerpt && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{excerpt}</p>}
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-3">
          {author && (
            <>
              <AuthorLink username={author.username} />
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}
