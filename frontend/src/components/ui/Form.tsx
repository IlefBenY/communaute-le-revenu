'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/app/actions/types';

export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} role={message ? 'alert' : undefined} className="min-h-0 text-sm text-brand-text empty:hidden">
      {message}
    </p>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return <span />;
  const ok = state.status === 'success';
  return (
    <p role="status" className={`text-sm ${ok ? 'text-ok' : 'text-brand-text'}`}>
      {state.message}
    </p>
  );
}
