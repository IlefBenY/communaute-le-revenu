'use client';

import { useActionState } from 'react';
import { createReply } from '@/app/actions/discussions';
import { initialFormState } from '@/app/actions/types';
import { FieldError, FormMessage, SubmitButton } from '@/components/ui/Form';
import { REPLY_MAX } from '@/lib/validation';

export function ReplyForm({ discussionId, slug, username }: { discussionId: string; slug: string; username: string }) {
  const [state, action] = useActionState(createReply, initialFormState);

  // React 19 réinitialise le formulaire après l'action ; en cas d'erreur, defaultValue restaure la saisie.
  return (
    <form action={action} className="card space-y-3 p-5" noValidate>
      <input type="hidden" name="discussion" value={discussionId} />
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor="reply-content" className="label">
        Votre réponse, {username}
      </label>
      <textarea
        id="reply-content"
        name="content"
        rows={4}
        maxLength={REPLY_MAX}
        required
        defaultValue={state.status === 'error' ? state.values?.content : ''}
        aria-invalid={Boolean(state.fieldErrors?.content)}
        aria-describedby="reply-content-error"
        placeholder="Partagez votre expérience. Rappel : pas de conseil personnalisé."
        className="input"
      />
      <FieldError id="reply-content-error" message={state.fieldErrors?.content} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Publication…">Publier ma réponse</SubmitButton>
      </div>
    </form>
  );
}
