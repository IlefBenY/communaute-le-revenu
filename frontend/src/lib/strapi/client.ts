import 'server-only';
import type { StrapiErrorBody } from './types';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';

export class StrapiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Erreurs de validation par champ (`title`, `content`…), si Strapi en renvoie. */
    readonly fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'StrapiError';
  }
}

type FetchOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** JWT de l'utilisateur ; jamais exposé au navigateur. */
  token?: string;
  query?: Record<string, string | number | undefined>;
};

const toQueryString = (query: FetchOptions['query'] = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/**
 * Point d'entrée unique vers l'API REST Strapi (côté serveur uniquement).
 * Normalise les erreurs HTTP en `StrapiError`.
 */
export async function strapiFetch<T>(path: string, { method = 'GET', body, token, query }: FetchOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${STRAPI_URL}${path}${toQueryString(query)}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new StrapiError(503, 'Le service de la communauté est momentanément indisponible.');
  }

  if (res.ok) return (await res.json()) as T;

  const payload = (await res.json().catch(() => null)) as StrapiErrorBody | null;
  const fieldErrors: Record<string, string> = {};
  for (const e of payload?.error.details?.errors ?? []) {
    const field = e.path?.[0];
    if (field && !fieldErrors[field]) fieldErrors[field] = e.message;
  }
  throw new StrapiError(res.status, payload?.error.message ?? res.statusText, fieldErrors);
}
