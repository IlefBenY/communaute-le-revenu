import { yup, validateYupSchema } from '@strapi/utils';

export const DISCUSSION_TYPES = ['question', 'discussion'] as const;
export const SORTS = {
  recent: ['createdAt:desc', 'id:desc'],
  oldest: ['createdAt:asc', 'id:asc'],
  popular: ['repliesCount:desc', 'createdAt:desc'],
} as const;
export type SortKey = keyof typeof SORTS;

const createDiscussionSchema = yup
  .object({
    title: yup
      .string()
      .trim()
      .required('Le titre est obligatoire.')
      .min(10, 'Le titre doit contenir au moins 10 caractères.')
      .max(160, 'Le titre ne peut pas dépasser 160 caractères.'),
    content: yup
      .string()
      .trim()
      .required('Le contenu est obligatoire.')
      .max(10000, 'Le contenu ne peut pas dépasser 10 000 caractères.'),
    type: yup
      .string()
      .required('Le type est obligatoire.')
      .oneOf([...DISCUSSION_TYPES], 'Le type doit être « question » ou « discussion ».'),
    category: yup.string().trim().required('La catégorie est obligatoire.'),
  })
  .required();

const listQuerySchema = yup.object({
  category: yup.string().trim().max(80),
  q: yup.string().trim().max(100),
  sort: yup.string().oneOf(Object.keys(SORTS)).default('recent'),
  page: yup.number().integer().min(1).default(1),
  pageSize: yup.number().integer().min(1).max(50).default(10),
});

export type CreateDiscussionInput = yup.InferType<typeof createDiscussionSchema>;
export type ListQuery = {
  category?: string;
  q?: string;
  sort: SortKey;
  page: number;
  pageSize: number;
};

export const validateCreateDiscussion = (data: unknown) =>
  validateYupSchema(createDiscussionSchema, { strict: false, stripUnknown: true, abortEarly: false })(
    data ?? {}
  ) as Promise<CreateDiscussionInput>;

export const validateListQuery = (query: Record<string, unknown>) =>
  validateYupSchema(listQuerySchema, { strict: false, stripUnknown: true, abortEarly: false })(
    query
  ) as Promise<ListQuery>;
