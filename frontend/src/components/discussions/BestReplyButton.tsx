'use client';

import { useFormStatus } from 'react-dom';
import { chooseBestReply } from '@/app/actions/discussions';

function Submit({ isBest }: { isBest: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-ok hover:bg-ok-soft disabled:opacity-60"
    >
      {pending ? '…' : isBest ? 'Retirer la meilleure réponse' : 'Choisir comme meilleure réponse'}
    </button>
  );
}

/** Visible uniquement par l'auteur de la discussion (Strapi vérifie de toute façon le droit). */
export function BestReplyButton({ discussionId, replyId, isBest }: { discussionId: string; replyId: string; isBest: boolean }) {
  return (
    <form action={chooseBestReply}>
      <input type="hidden" name="discussion" value={discussionId} />
      <input type="hidden" name="reply" value={isBest ? '' : replyId} />
      <Submit isBest={isBest} />
    </form>
  );
}
