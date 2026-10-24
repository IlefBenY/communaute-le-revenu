import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/lib/safe-redirect';

describe('safeRedirectPath (anti open redirect)', () => {
  it.each(['/', '/nouvelle-discussion', '/discussions/abc?x=1#reponse-3'])('accepte le chemin interne %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    'javascript:alert(1)',
    'evil.com',
    '',
    null,
  ])('rejette %j', (value) => {
    expect(safeRedirectPath(value)).toBe('/');
  });
});
