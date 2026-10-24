const BASE = 'http://internal.invalid';

/**
 * N'autorise que les redirections internes (anti open redirect).
 * Le navigateur interprète `\` comme `/` et ignore tabulations / retours à la ligne :
 * `/\evil.com` ou `/\t/evil.com` deviendraient `//evil.com`. On rejette donc ces caractères,
 * puis on vérifie après résolution que l'URL reste sur la même origine.
 */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
