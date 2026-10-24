import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { Avatar } from '@/components/ui/Avatar';
import { getCurrentUser } from '@/lib/auth/session';

/** Lit le cookie de session : rendu dynamique, isolé dans un <Suspense> par le Header. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link href="/connexion" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10">
          Se connecter
        </Link>
        <Link href="/nouvelle-discussion" className="btn-primary hidden sm:inline-flex">
          Nouvelle discussion
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/nouvelle-discussion" className="btn-primary">
        <span className="sm:hidden">Publier</span>
        <span className="hidden sm:inline">Nouvelle discussion</span>
      </Link>
      <span className="hidden items-center gap-2 text-sm text-white/90 md:flex">
        <Avatar name={user.username} />
        {user.username}
      </span>
      <form action={logout}>
        <button type="submit" className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
          Déconnexion
        </button>
      </form>
    </>
  );
}
