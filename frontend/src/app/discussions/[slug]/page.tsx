import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ReplyComposer } from '@/components/discussions/ReplyComposer';
import { ReplyList } from '@/components/discussions/ReplyList';
import { AuthorLink } from '@/components/ui/AuthorLink';
import { CategoryBadge, TypeBadge } from '@/components/ui/Badges';
import { RichText } from '@/components/ui/RichText';
import { formatDateTime, pluralize } from '@/lib/format';
import { getCurrentUser, getMyUsefulVotes } from '@/lib/auth/session';
import { getDiscussionBySlug } from '@/lib/strapi/queries';
import type { DiscussionDetail } from '@/lib/strapi/types';

export async function generateMetadata({ params }: PageProps<'/discussions/[slug]'>): Promise<Metadata> {
  const discussion = await getDiscussionBySlug((await params).slug);
  return discussion ? { title: discussion.title, description: discussion.excerpt } : { title: 'Discussion introuvable' };
}

export default function DiscussionPage({ params }: PageProps<'/discussions/[slug]'>) {
  return (
    <Suspense fallback={<DiscussionSkeleton />}>
      <Discussion params={params} />
    </Suspense>
  );
}

async function Discussion({ params }: { params: PageProps<'/discussions/[slug]'>['params'] }) {
  const { slug } = await params;
  const discussion = await getDiscussionBySlug(slug);
  if (!discussion) notFound();

  const { title, content, type, author, category, publishedAt, replies, documentId, solved } = discussion;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-ink-3">
        <Link href="/" className="hover:text-ink">
          Discussions
        </Link>
        {category && (
          <>
            {' / '}
            <Link href={`/?category=${category.slug}`} className="hover:text-ink">
              {category.name}
            </Link>
          </>
        )}
      </nav>

      <article className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {category && <CategoryBadge category={category} />}
          <TypeBadge type={type} />
          {solved && <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[11px] font-semibold text-ok">Résolue</span>}
        </div>
        <h1 className="mt-2 font-serif text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-3">
          {author && (
            <>
              <AuthorLink username={author.username} size="md" />
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time>
        </p>
        <div className="mt-5">
          <RichText text={content} />
        </div>
      </article>

      <section aria-labelledby="replies-title" className="space-y-4">
        <h2 id="replies-title" className="font-serif text-xl font-bold">
          {pluralize(replies.length, 'réponse')}
        </h2>
        {/* Les votes et droits dépendent de l'utilisateur : partie dynamique isolée. */}
        <Suspense fallback={<div className="card h-40 animate-pulse" />}>
          <Replies discussion={discussion} />
        </Suspense>
        <Suspense fallback={<div className="card h-40 animate-pulse" />}>
          <ReplyComposer discussionId={documentId} slug={slug} />
        </Suspense>
      </section>
    </div>
  );
}

async function Replies({ discussion }: { discussion: DiscussionDetail }) {
  const user = await getCurrentUser();
  const votes = user ? await getMyUsefulVotes(discussion.documentId) : [];
  const viewer = user
    ? { documentId: user.documentId, isDiscussionAuthor: user.documentId === discussion.author?.documentId, votes }
    : null;

  return (
    <ReplyList
      replies={discussion.replies}
      discussionId={discussion.documentId}
      bestReply={discussion.bestReply}
      viewer={viewer}
      loginHref={`/connexion?next=${encodeURIComponent(`/discussions/${discussion.slug}`)}`}
    />
  );
}

function DiscussionSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6" aria-busy="true" aria-label="Chargement de la discussion">
      <div className="h-4 w-48 rounded bg-fill" />
      <div className="card space-y-4 p-7">
        <div className="h-3 w-32 rounded bg-fill" />
        <div className="h-8 w-3/4 rounded bg-fill" />
        <div className="h-4 w-40 rounded bg-fill" />
        <div className="h-24 rounded bg-fill" />
      </div>
    </div>
  );
}
