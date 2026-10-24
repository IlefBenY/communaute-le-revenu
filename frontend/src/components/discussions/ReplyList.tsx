import { Avatar } from '@/components/ui/Avatar';
import { RichText } from '@/components/ui/RichText';
import { formatDateTime } from '@/lib/format';
import type { Reply } from '@/lib/strapi/types';

export function ReplyList({ replies }: { replies: Reply[] }) {
  if (replies.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand/50 px-5 py-6 text-center text-sm text-ink-3">
        Personne n’a encore répondu. Partagez votre expérience !
      </p>
    );
  }

  return (
    <ol className="card divide-y divide-line">
      {replies.map((reply) => (
        <li key={reply.documentId} id={`reponse-${reply.id}`} className="p-5" data-testid="reply">
          <p className="mb-2 flex items-center gap-2 text-sm text-ink-3">
            {reply.author && (
              <>
                <Avatar name={reply.author.username} />
                <span className="font-semibold text-ink">{reply.author.username}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <time dateTime={reply.createdAt}>{formatDateTime(reply.createdAt)}</time>
          </p>
          <RichText text={reply.content} />
        </li>
      ))}
    </ol>
  );
}
