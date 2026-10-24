import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DiscussionForm } from '@/components/discussions/DiscussionForm';
import { getCurrentUser } from '@/lib/auth/session';
import { getCategories } from '@/lib/strapi/queries';

export const metadata: Metadata = { title: 'Nouvelle discussion' };

export default function NewDiscussionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold">Lancer une discussion</h1>
        <p className="mt-1 text-sm text-ink-3">
          Partage d’expérience uniquement : pas de conseil personnalisé ni de sollicitation.
        </p>
      </div>
      <Suspense fallback={<div className="card h-96 animate-pulse" />}>
        <NewDiscussion />
      </Suspense>
    </div>
  );
}

async function NewDiscussion() {
  // Redirection côté serveur pour l'UX ; la vraie protection reste la permission Strapi.
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?next=/nouvelle-discussion');

  const categories = await getCategories();
  return <DiscussionForm categories={categories.map(({ slug, name }) => ({ slug, name }))} />;
}
