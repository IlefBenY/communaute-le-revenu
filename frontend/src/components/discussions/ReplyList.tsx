import { AuthorLink } from '@/components/ui/AuthorLink';
import { RichText } from '@/components/ui/RichText';
import { formatDateTime } from '@/lib/format';
import type { Reply } from '@/lib/strapi/types';
import { BestReplyButton } from './BestReplyButton';
import { UsefulButton } from './UsefulButton';

type Viewer = { documentId: string; isDiscussionAuthor: boolean; votes: string[] } | null;

type Props = {
  replies: Reply[];
  discussionId: string;
  bestReply: string | null;
  viewer: Viewer;
  loginHref: string;
};

/** La meilleure réponse est affichée en premier, mise en évidence. */
export function ReplyList({ replies, discussionId, bestReply, viewer, loginHref }: Props) {
  if (replies.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand/50 px-5 py-6 text-center text-sm text-ink-3">
        Personne n’a encore répondu. Partagez votre expérience !
      </p>
    );
  }

  const ordered = [...replies].sort((a, b) => Number(b.documentId === bestReply) - Number(a.documentId === bestReply));

  return (
    <ol className="card divide-y divide-line overflow-hidden">
      {ordered.map((reply) => {
        const isBest = reply.documentId === bestReply;
        const isOwn = viewer?.documentId === reply.author?.documentId;
        return (
          <li
            key={reply.documentId}
            id={`reponse-${reply.id}`}
            data-testid="reply"
            data-best={isBest || undefined}
            className={`p-5 ${isBest ? 'border-l-4 border-ok bg-ok-soft/50' : ''}`}
          >
            {isBest && (
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-ok px-2 py-0.5 text-xs font-semibold text-white">
                ✓ Meilleure réponse
              </p>
            )}
            <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-ink-3">
              {reply.author && (
                <>
                  <AuthorLink username={reply.author.username} />
                  <span aria-hidden>·</span>
                </>
              )}
              <time dateTime={reply.createdAt}>{formatDateTime(reply.createdAt)}</time>
            </p>
            <RichText text={reply.content} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <UsefulButton
                replyId={reply.documentId}
                count={reply.usefulCount}
                voted={viewer?.votes.includes(reply.documentId) ?? false}
                disabledReason={!viewer ? 'anonymous' : isOwn ? 'own' : undefined}
                loginHref={loginHref}
              />
              {viewer?.isDiscussionAuthor && (
                <BestReplyButton discussionId={discussionId} replyId={reply.documentId} isBest={isBest} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
