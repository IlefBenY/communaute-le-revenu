import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { ReplyForm } from './ReplyForm';

/** Partie dynamique de la page : dépend de la session de l'utilisateur. */
export async function ReplyComposer({ discussionId, slug }: { discussionId: string; slug: string }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-ink-2">Connectez-vous pour participer à la discussion.</p>
        <Link href={`/connexion?next=/discussions/${slug}`} className="btn-primary">
          Se connecter pour répondre
        </Link>
      </div>
    );
  }

  return <ReplyForm discussionId={discussionId} slug={slug} username={user.username} />;
}
