import { yup, validateYupSchema } from '@strapi/utils';

const createReplySchema = yup
  .object({
    content: yup
      .string()
      .trim()
      .required('La réponse ne peut pas être vide.')
      .max(5000, 'La réponse ne peut pas dépasser 5 000 caractères.'),
    discussion: yup.string().trim().required('La discussion est obligatoire.'),
  })
  .required();

export type CreateReplyInput = yup.InferType<typeof createReplySchema>;

export const validateCreateReply = (data: unknown) =>
  validateYupSchema(createReplySchema, { strict: false, stripUnknown: true, abortEarly: false })(
    data ?? {}
  ) as Promise<CreateReplyInput>;
