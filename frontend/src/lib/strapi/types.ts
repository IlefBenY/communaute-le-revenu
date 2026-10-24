/** Types du contrat d'API exposé par les controllers Strapi (voir backend/src/api). */

export type DiscussionType = 'question' | 'discussion';
export type SortKey = 'recent' | 'oldest' | 'popular';

export type Author = { id: number; documentId: string; username: string };

export type Category = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
};

export type CategoryRef = Pick<Category, 'documentId' | 'name' | 'slug' | 'color'>;

export type DiscussionSummary = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  type: DiscussionType;
  excerpt: string;
  repliesCount: number;
  /** Une meilleure réponse a été choisie. */
  solved: boolean;
  publishedAt: string;
  author: Author | null;
  category: CategoryRef | null;
};

export type Reply = {
  id: number;
  documentId: string;
  content: string;
  usefulCount: number;
  createdAt: string;
  author: Author | null;
  /** Renvoyé uniquement à la création d'une réponse. */
  discussion?: { documentId: string; slug: string };
};

export type DiscussionDetail = DiscussionSummary & { content: string; bestReply: string | null; replies: Reply[] };

export type UsefulToggle = { reply: string; usefulCount: number; voted: boolean; discussion: { documentId: string; slug: string } | null };

export type Member = {
  username: string;
  memberSince: string;
  stats: { discussions: number; replies: number; bestAnswers: number; usefulReceived: number };
  discussions: Pick<DiscussionSummary, 'documentId' | 'title' | 'slug' | 'type' | 'repliesCount' | 'solved' | 'publishedAt' | 'category'>[];
  replies: {
    documentId: string;
    excerpt: string;
    usefulCount: number;
    createdAt: string;
    discussion: { title: string; slug: string } | null;
  }[];
};

export type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

export type Paginated<T> = { data: T[]; meta: { pagination: Pagination } };
export type Single<T> = { data: T };

export type DiscussionListParams = {
  category?: string;
  q?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

export type CurrentUser = { id: number; documentId: string; username: string; email: string };

/** Format d'erreur standard de Strapi. */
export type StrapiErrorBody = {
  data: null;
  error: {
    status: number;
    name: string;
    message: string;
    details?: { errors?: { path: string[]; message: string }[] };
  };
};
