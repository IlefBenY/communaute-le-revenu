/**
 * Validation côté client/Server Action, alignée sur les règles Strapi
 * (backend/src/api/discussion/validation.ts). Strapi reste la source de vérité.
 */
export const TITLE_MIN = 10;
export const TITLE_MAX = 160;
export const CONTENT_MAX = 10000;
export const REPLY_MAX = 5000;
export const DISCUSSION_TYPES = [
  { value: 'question', label: 'Question', hint: 'Vous attendez une réponse précise' },
  { value: 'discussion', label: 'Discussion', hint: 'Vous lancez un échange ouvert' },
] as const;

type FieldErrors = Record<string, string>;

export function validateDiscussionInput(v: { title: string; content: string; category: string; type: string }) {
  const errors: FieldErrors = {};
  const title = v.title.trim();
  if (!title) errors.title = 'Le titre est obligatoire.';
  else if (title.length < TITLE_MIN) errors.title = `Le titre doit contenir au moins ${TITLE_MIN} caractères.`;
  else if (title.length > TITLE_MAX) errors.title = `Le titre ne peut pas dépasser ${TITLE_MAX} caractères.`;

  if (!v.content.trim()) errors.content = 'Le contenu est obligatoire.';
  else if (v.content.length > CONTENT_MAX) errors.content = 'Le contenu est trop long.';

  if (!v.category) errors.category = 'Choisissez une catégorie.';
  if (!DISCUSSION_TYPES.some((t) => t.value === v.type)) errors.type = 'Choisissez un type.';
  return errors;
}

export function validateReplyInput(v: { content: string }) {
  const errors: FieldErrors = {};
  if (!v.content.trim()) errors.content = 'La réponse ne peut pas être vide.';
  else if (v.content.length > REPLY_MAX) errors.content = 'La réponse est trop longue.';
  return errors;
}
