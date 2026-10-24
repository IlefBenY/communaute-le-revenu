'use server';

import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken } from '@/lib/auth/session';
import { StrapiError, strapiFetch } from '@/lib/strapi/client';
import { TAGS } from '@/lib/strapi/queries';
import type { DiscussionDetail, Reply, Single } from '@/lib/strapi/types';
import { validateDiscussionInput, validateReplyInput } from '@/lib/validation';
import type { FormState } from './types';

const toErrorState = (error: unknown, values: Record<string, string>): FormState => {
  if (error instanceof StrapiError) {
    if (error.status === 401 || error.status === 403) {
      return { status: 'error', message: 'Votre session a expiré, reconnectez-vous pour publier.', values };
    }
    if (error.status === 404) return { status: 'error', message: 'Cette discussion n’existe plus.', values };
    if (error.status === 400) {
      return { status: 'error', message: 'Certains champs sont invalides.', fieldErrors: error.fieldErrors, values };
    }
  }
  return { status: 'error', message: 'Une erreur inattendue est survenue. Réessayez.', values };
};

/**
 * Le contrôle côté client améliore l'UX ; la validation qui fait foi reste celle de Strapi.
 * L'auteur n'est jamais envoyé : Strapi le déduit du JWT.
 */
export async function createDiscussion(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    title: String(formData.get('title') ?? ''),
    content: String(formData.get('content') ?? ''),
    category: String(formData.get('category') ?? ''),
    type: String(formData.get('type') ?? ''),
  };

  const fieldErrors = validateDiscussionInput(values);
  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Certains champs sont invalides.', fieldErrors, values };
  }

  const token = await getToken();
  if (!token) redirect('/connexion?next=/nouvelle-discussion');

  let slug: string;
  try {
    const res = await strapiFetch<Single<DiscussionDetail>>('/api/discussions', {
      method: 'POST',
      token,
      body: { data: values },
    });
    slug = res.data.slug;
  } catch (error) {
    return toErrorState(error, values);
  }

  updateTag(TAGS.discussions);
  redirect(`/discussions/${slug}`);
}

export async function createReply(_prev: FormState, formData: FormData): Promise<FormState> {
  const discussion = String(formData.get('discussion') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const values = { content: String(formData.get('content') ?? '') };

  const fieldErrors = validateReplyInput(values);
  if (Object.keys(fieldErrors).length) return { status: 'error', fieldErrors, values };

  const token = await getToken();
  if (!token) redirect(`/connexion?next=${encodeURIComponent(`/discussions/${slug}`)}`);

  let reply: Reply;
  try {
    const res = await strapiFetch<Single<Reply>>('/api/replies', {
      method: 'POST',
      token,
      body: { data: { discussion, content: values.content } },
    });
    reply = res.data;
  } catch (error) {
    return toErrorState(error, values);
  }

  // Le slug à invalider vient de Strapi, pas du champ caché du formulaire.
  if (reply.discussion) updateTag(TAGS.discussion(reply.discussion.slug));
  updateTag(TAGS.discussions);
  return { status: 'success', message: 'Votre réponse a été publiée.' };
}
