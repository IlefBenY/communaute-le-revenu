import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeRedirectPath } from '@/lib/safe-redirect';

export const metadata: Metadata = { title: 'Connexion' };

const DEMO_USERS = ['Thomas_PEA', 'Vincent_ETF', 'Claire_Nantes', 'LaRedaction'];

export default function LoginPage({ searchParams }: PageProps<'/connexion'>) {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold">Se connecter</h1>
        <p className="mt-1 text-sm text-ink-3">Avec votre compte lerevenu.com</p>
      </div>
      <Suspense fallback={<div className="card h-72 animate-pulse" />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
      <aside className="card p-5 text-sm">
        <p className="font-semibold">Comptes de démonstration</p>
        <p className="mt-1 text-ink-3">
          Mot de passe commun : <code className="rounded bg-fill px-1.5 py-0.5 text-ink">Demo1234!</code>
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {DEMO_USERS.map((u) => (
            <li key={u} className="rounded-full bg-fill px-2.5 py-1 text-xs text-ink-2">
              {u}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<'/connexion'>['searchParams'] }) {
  const { next } = await searchParams;
  return <LoginForm next={safeRedirectPath(next)} />;
}
