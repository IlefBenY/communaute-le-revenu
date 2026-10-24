'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { initialFormState } from '@/app/actions/types';
import { FormMessage, SubmitButton } from '@/components/ui/Form';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, initialFormState);

  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="identifier" className="label">
          Pseudo ou e-mail
        </label>
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          className="input"
          defaultValue={state.values?.identifier}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Mot de passe
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}
