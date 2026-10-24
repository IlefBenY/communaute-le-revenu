import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { RepliesCounter } from '@/components/discussions/DiscussionCard';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';
import { getMember } from '@/lib/strapi/queries';

export async function generateMetadata({ params }: PageProps<'/membres/[username]'>): Promise<Metadata> {
  const member = await getMember(decodeURIComponent((await params).username));
  return { title: member ? `Profil de ${member.username}` : 'Membre introuvable' };
}

export default function MemberPage({ params }: PageProps<'/membres/[username]'>) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl"><div className="card h-48 animate-pulse" /></div>}>
      <Profile params={params} />
    </Suspense>
  );
}

const memberSince = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso));

async function Profile({ params }: { params: PageProps<'/membres/[username]'>['params'] }) {
  const member = await getMember(decodeURIComponent((await params).username));
  if (!member) notFound();

  const stats = [
    { label: 'discussions', value: member.stats.discussions },
    { label: 'réponses', value: member.stats.replies },
    { label: 'meilleures réponses', value: member.stats.bestAnswers },
    { label: '« Utile » reçus', value: member.stats.usefulReceived },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card flex flex-wrap items-center gap-5 p-6">
        <Avatar name={member.username} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-bold">{member.username}</h1>
          <p className="text-sm text-ink-3">Membre depuis {memberSince(member.memberSince)}</p>
        </div>
        <dl className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse rounded-xl bg-fill px-3 py-2 text-center">
              <dt className="text-xs text-ink-3">{s.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="member-discussions" className="space-y-3">
        <h2 id="member-discussions" className="font-serif text-xl font-bold">Discussions récentes</h2>
        {member.discussions.length === 0 ? (
          <EmptyState title="Aucune discussion lancée" />
        ) : (
          <ul className="card divide-y divide-line">
            {member.discussions.map((d) => (
              <li key={d.documentId} className="flex gap-4 p-4">
                <RepliesCounter count={d.repliesCount} solved={d.solved} />
                <div className="min-w-0">
                  {d.category && <CategoryBadge category={d.category} />}
                  <Link href={`/discussions/${d.slug}`} className="block font-serif text-lg font-bold leading-snug hover:underline">
                    {d.title}
                  </Link>
                  <time dateTime={d.publishedAt} className="text-xs text-ink-3">{formatDate(d.publishedAt)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="member-replies" className="space-y-3">
        <h2 id="member-replies" className="font-serif text-xl font-bold">Réponses récentes</h2>
        {member.replies.length === 0 ? (
          <EmptyState title="Aucune réponse publiée" />
        ) : (
          <ul className="card divide-y divide-line">
            {member.replies.map((r) => (
              <li key={r.documentId} className="p-4">
                {r.discussion && (
                  <Link href={`/discussions/${r.discussion.slug}`} className="text-sm font-semibold text-ink hover:underline">
                    {r.discussion.title}
                  </Link>
                )}
                <p className="mt-1 text-sm text-ink-2">{r.excerpt}</p>
                <p className="mt-1 text-xs text-ink-3">
                  <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time> · {r.usefulCount} « Utile »
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
