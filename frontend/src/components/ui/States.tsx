import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="font-serif text-xl font-bold text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-3">{children}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Une erreur est survenue', message, action }: { title?: string; message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="card border-brand/40 px-6 py-10 text-center">
      <p className="font-serif text-xl font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-3">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
