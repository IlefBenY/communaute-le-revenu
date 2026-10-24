import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';
import type { DiscussionSummary } from '@/lib/strapi/types';
import { DiscussionCard } from './DiscussionCard';

/** `filtered` : liste vide à cause d'un filtre, d'une recherche ou d'une page hors limites. */
export function DiscussionList({ discussions, filtered = false }: { discussions: DiscussionSummary[]; filtered?: boolean }) {
  if (discussions.length === 0 && filtered) {
    return (
      <EmptyState title="Aucun résultat">
        <p>Aucune discussion ne correspond à ces critères.</p>
        <Link href="/" className="btn-secondary mt-4">
          Voir toutes les discussions
        </Link>
      </EmptyState>
    );
  }

  if (discussions.length === 0) {
    return (
      <EmptyState title="Aucune discussion pour le moment">
        <p>Soyez le premier à lancer le sujet.</p>
        <Link href="/nouvelle-discussion" className="btn-primary mt-4">
          Lancer une discussion
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="card divide-y divide-line overflow-hidden">
      {discussions.map((d) => (
        <DiscussionCard key={d.documentId} discussion={d} />
      ))}
    </div>
  );
}

export function DiscussionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="card divide-y divide-line overflow-hidden" aria-busy="true" aria-label="Chargement des discussions">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex animate-pulse gap-4 p-5">
          <div className="size-14 rounded-xl bg-fill" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 w-28 rounded bg-fill" />
            <div className="h-5 w-3/4 rounded bg-fill" />
            <div className="h-3 w-full rounded bg-fill" />
            <div className="h-3 w-40 rounded bg-fill" />
          </div>
        </div>
      ))}
    </div>
  );
}
