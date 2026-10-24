import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { StrapiError, strapiFetch } from '@/lib/strapi/client';
import type { CurrentUser } from '@/lib/strapi/types';

/**
 * Le JWT Strapi est stocké dans un cookie httpOnly : inaccessible au JavaScript du
 * navigateur, il n'est lu que côté serveur pour être transmis à Strapi.
 */
const COOKIE = 'lr_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export async function getToken() {
  return (await cookies()).get(COOKIE)?.value;
}

export async function setSession(jwt: string) {
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    // Secure en production, désactivable pour une démo locale en HTTP (Safari refuse un cookie Secure sur http://localhost).
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Utilisateur courant (dédupliqué sur la durée d'une requête). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    return await strapiFetch<CurrentUser>('/api/users/me', { token });
  } catch (error) {
    if (error instanceof StrapiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
});

/** Réponses d'une discussion que l'utilisateur courant a marquées « Utile » (non mis en cache). */
export async function getMyUsefulVotes(discussionDocumentId: string): Promise<string[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const res = await strapiFetch<{ data: string[] }>('/api/replies/useful/mine', {
      token,
      query: { discussion: discussionDocumentId },
    });
    return res.data;
  } catch (error) {
    if (error instanceof StrapiError && (error.status === 401 || error.status === 403)) return [];
    throw error;
  }
}
