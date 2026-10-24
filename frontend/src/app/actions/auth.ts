'use server';

import { redirect } from 'next/navigation';
import { clearSession, setSession } from '@/lib/auth/session';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { StrapiError, strapiFetch } from '@/lib/strapi/client';
import type { FormState } from './types';

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const values = { identifier };

  if (!identifier || !password) {
    return { status: 'error', message: 'Identifiant et mot de passe sont obligatoires.', values };
  }

  try {
    const { jwt } = await strapiFetch<{ jwt: string }>('/api/auth/local', {
      method: 'POST',
      body: { identifier, password },
    });
    await setSession(jwt);
  } catch (error) {
    const message =
      error instanceof StrapiError && error.status === 400
        ? 'Identifiant ou mot de passe incorrect.'
        : 'Connexion impossible pour le moment. Réessayez plus tard.';
    return { status: 'error', message, values };
  }

  redirect(safeRedirectPath(formData.get('next')));
}

export async function logout() {
  await clearSession();
  redirect('/');
}
