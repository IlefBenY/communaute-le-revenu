'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { toggleUseful, type UsefulState } from '@/app/actions/discussions';

type Props = {
  replyId: string;
  count: number;
  voted: boolean;
  /** `anonymous` : visiteur ; `own` : réponse de l'utilisateur courant. */
  disabledReason?: 'anonymous' | 'own';
  loginHref: string;
};

const ThumbIcon = () => (
  <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="currentColor">
    <path d="M2 9.5A1.5 1.5 0 0 1 3.5 8h1A1.5 1.5 0 0 1 6 9.5v7A1.5 1.5 0 0 1 4.5 18h-1A1.5 1.5 0 0 1 2 16.5v-7Zm5-.3c0-.4.1-.8.4-1.1l3.9-5.3a1.3 1.3 0 0 1 2.3 1l-.7 3.2h3.4a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 15.1 17H9a2 2 0 0 1-2-2V9.2Z" />
  </svg>
);

const base = 'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors';

function Submit({ voted, count }: { voted: boolean; count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={voted}
      className={`${base} ${voted ? 'border-ok bg-ok-soft text-ok' : 'border-line text-ink-2 hover:bg-fill'} disabled:opacity-60`}
    >
      <ThumbIcon />
      Utile <span className="tabular-nums">{count}</span>
    </button>
  );
}

export function UsefulButton({ replyId, count, voted, disabledReason, loginHref }: Props) {
  const [state, action] = useActionState<UsefulState, FormData>(toggleUseful, { usefulCount: count, voted });

  if (disabledReason === 'anonymous') {
    return (
      <Link href={loginHref} className={`${base} border-line text-ink-2 hover:bg-fill`} title="Connectez-vous pour voter">
        <ThumbIcon />
        Utile <span className="tabular-nums">{count}</span>
      </Link>
    );
  }

  if (disabledReason === 'own') {
    return (
      <span className={`${base} border-line text-ink-3`} title="Vous ne pouvez pas voter pour votre propre réponse">
        <ThumbIcon />
        Utile <span className="tabular-nums">{count}</span>
      </span>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="reply" value={replyId} />
      <Submit voted={state.voted} count={state.usefulCount} />
      {state.error && (
        <span role="alert" className="text-xs text-brand-text">
          {state.error}
        </span>
      )}
    </form>
  );
}
