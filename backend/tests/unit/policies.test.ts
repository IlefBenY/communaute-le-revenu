import { errors } from '@strapi/utils';
import isAuthenticated from '../../src/policies/is-authenticated';
import isNotImpersonating from '../../src/policies/is-not-impersonating';

const user = { id: 11, documentId: 'thomas-doc' };
const context = (u: typeof user | undefined, author?: unknown) =>
  ({ state: { user: u }, request: { body: { data: author === undefined ? {} : { author } } } }) as never;
const run = (policy: (...args: never[]) => unknown, ctx: never) => () => policy(ctx, {} as never, {} as never);

describe('policy is-authenticated', () => {
  it('lève une 401 sans utilisateur (si la permission était ouverte par erreur au rôle Public)', () => {
    expect(run(isAuthenticated, context(undefined))).toThrow(errors.UnauthorizedError);
  });

  it('laisse passer un utilisateur authentifié', () => {
    expect(run(isAuthenticated, context(user))()).toBe(true);
  });
});

describe('policy is-not-impersonating', () => {
  it.each([undefined, null, 11, '11', 'thomas-doc', { id: 11 }, { documentId: 'thomas-doc' }])(
    'accepte un auteur absent ou égal à l’utilisateur : %j',
    (author) => {
      expect(run(isNotImpersonating, context(user, author))()).toBe(true);
    }
  );

  it.each([1, '1', 'autre-doc', { id: 1 }, { documentId: 'autre-doc' }])('refuse un autre auteur : %j', (author) => {
    expect(run(isNotImpersonating, context(user, author))).toThrow(errors.PolicyError);
  });
});
