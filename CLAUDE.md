# CLAUDE.md

Technical test "Communauté Le Revenu": a community forum built with **Strapi v5 + PostgreSQL** (backend) and **Next.js 16 App Router** (frontend). Full context, setup and architecture choices are in [README.md](README.md) (French).

## Ground rule of the architecture

Strapi owns data, business rules and permissions. Next.js renders pages and forwards user actions with the user's JWT; it never queries PostgreSQL and never makes authorization decisions (its login redirects are UX only).

## Commands

```bash
./scripts/setup-env.sh                     # creates backend/.env (random secrets) + frontend/.env.local
docker compose up -d                       # PostgreSQL only (dev)
docker compose --profile full up --build   # PostgreSQL + Strapi (:1337) + Next (:3000)

cd backend  && npm run develop             # Strapi dev; seeds demo data on an empty DB
cd backend  && npm test                    # Jest + supertest on a real Strapi; DB `communaute_test` is dropped/recreated (needs Postgres up)
cd frontend && npm run dev
cd frontend && npm test                    # Vitest + Testing Library
cd frontend && npm run typecheck && npx eslint .
cd frontend && npm run test:e2e            # Playwright; needs Strapi running; WRITES "Test E2E …" discussions to the dev DB
```

Demo users (end users, not admins): `Thomas_PEA`, `Vincent_ETF`, `Claire_Nantes`, `LaRedaction`… password `Demo1234!`.

## Where things are

Backend (`backend/src`):
- `api/{category,discussion,reply}/content-types/*/schema.json` — data model (draftAndPublish off; `repliesCount` denormalised).
- `api/*/validation.ts` — yup schemas (`@strapi/utils`), the authoritative validation.
- `api/*/services/*.ts` — business logic with the Document Service API; returns DTOs (never the full User).
- `api/*/controllers/*.ts` — thin HTTP layer; `api/*/routes/*.ts` — only needed actions exposed + policies.
- `policies/is-authenticated.ts`, `policies/is-not-impersonating.ts` — global policies on `create`.
- `bootstrap/permissions.ts` (role permissions as code), `bootstrap/indexes.ts`, `bootstrap/seed.ts` (+ `data/seed/*.json`).
- `tests/` — `unit/` and `api/` (the brief's required cases: validation, unauthenticated refusal, impersonation, listing).

Frontend (`frontend/src`):
- `lib/strapi/client.ts` (single typed fetch, `StrapiError`), `queries.ts` (`'use cache'` + `cacheTag`), `types.ts`.
- `lib/auth/session.ts` — JWT in an httpOnly cookie, `getCurrentUser()`.
- `app/actions/*` — Server Actions (login/logout, createDiscussion, createReply) calling `updateTag` after writes.
- `app/` routes: `/`, `/discussions/[slug]`, `/nouvelle-discussion`, `/connexion`.

## Things that look odd but are intentional

- **Next.js 16 differs from older versions** (Cache Components on by default, `'use cache'`, `cacheLife`, `updateTag`, async `params`, `PageProps<'/route'>`). Check `frontend/node_modules/next/dist/docs/` before changing data fetching or caching. Request-time data is wrapped in `<Suspense>` on purpose.
- The impersonation policy throws `errors.PolicyError`: it is the only 403 whose message Strapi keeps (other `ForbiddenError`s are replaced by a generic "Forbidden").
- The API's `publishedAt` field is sourced from `createdAt`: with Draft & Publish off, Strapi rewrites `publishedAt` on every update (including admin edits), while `createdAt` never changes. Sorting uses `createdAt` too.
- `repliesCount` is updated with `strapi.db.query()` (Query Engine) so the counter update does not go through the Document Service publication logic.
- `createForAuthor` retries with a random slug suffix on a unique-index violation (concurrent identical titles).
- Categories have a custom read-only controller that ignores client `populate`/`fields` (no raw discussions through the inverse relation).
- `process.env.TZ = 'UTC'` in `src/index.ts`: columns are `timestamp without time zone`, so the process timezone must be fixed.
- `config/plugins.ts` uses `jwtManagement: 'legacy-support'` (7-day JWT): the Next server keeps the token; the default "refresh" mode sets a Secure cookie that fails over HTTP in production.
- Unauthenticated writes return 403 (Public role lacks the permission, checked before policies), so `is-authenticated` is defence in depth and is covered by unit tests in `backend/tests/unit/policies.test.ts`. Known limitations are listed in the README §5.
- Login redirects go through `frontend/src/lib/safe-redirect.ts` (rejects `\`, control characters, other origins).

## Conventions

TypeScript strict on both sides. Code comments and UI copy are in French. Keep controllers thin, put logic in services, and add a test in `backend/tests/api` for any new rule.
