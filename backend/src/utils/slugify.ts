/**
 * Transforme un texte libre en slug URL-safe (accents retirés, minuscules, tirets).
 */
export const slugify = (input: string, maxLength = 80): string =>
  input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '') || 'discussion';
