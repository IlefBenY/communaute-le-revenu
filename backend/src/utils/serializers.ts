/**
 * DTO publics exposés par l'API : on ne renvoie jamais l'objet User complet
 * (email, provider, etc.), seulement les champs nécessaires à l'affichage.
 */
type AuthorEntity = { id: number; documentId: string; username: string } | null | undefined;
type CategoryEntity = { documentId: string; name: string; slug: string; color?: string | null } | null | undefined;

export type AuthorDTO = { id: number; documentId: string; username: string } | null;

export const toAuthor = (author: AuthorEntity): AuthorDTO =>
  author ? { id: author.id, documentId: author.documentId, username: author.username } : null;

export const toCategory = (category: CategoryEntity) =>
  category
    ? { documentId: category.documentId, name: category.name, slug: category.slug, color: category.color ?? null }
    : null;

export const excerpt = (text: string, max = 220): string => {
  const flat = text.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max).replace(/\s+\S*$/, '')}…` : flat;
};
