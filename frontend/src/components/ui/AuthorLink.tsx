import Link from 'next/link';
import { Avatar } from './Avatar';

export const memberHref = (username: string) => `/membres/${encodeURIComponent(username)}`;

/** Avatar + pseudo cliquable vers le profil public du membre. */
export function AuthorLink({ username, size = 'sm' }: { username: string; size?: 'sm' | 'md' }) {
  return (
    <Link href={memberHref(username)} className="relative z-10 inline-flex items-center gap-2 hover:underline">
      <Avatar name={username} size={size} />
      <span className="font-semibold text-ink">{username}</span>
    </Link>
  );
}
