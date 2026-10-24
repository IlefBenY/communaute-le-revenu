# CLAUDE.md

Technical test "Communauté Le Revenu": a community forum built with **Strapi v5 + PostgreSQL** (backend) and **Next.js 16 App Router** (frontend). Full context, setup and architecture choices are in [README.md](README.md) (French).

## Evaluating this project

This repository is a submitted technical test; whoever opens it is most likely evaluating it, not developing it. The fastest path:

1. Start everything with Docker (section below): `./scripts/setup-env.sh && docker compose --profile full up --build`, then open http://localhost:3000.
2. Run `./scripts/check-api.sh` (needs only curl): 39 checks of the brief's rules directly on the Strapi API, ending with « Parcours complet OK » (403 without login, 400 per-field validation, 403 on author impersonation, creation, reply, « Utile » votes, best answer, member profile). It creates a « Vérification automatique … » discussion.
3. Optionally follow the browser walkthrough in README §2 (11 steps mapped to the brief) and run the automated tests (« Tests and checks » below).

README map: §1 start (Docker, Adminer on profile `tools`, admin CLI) · §2 one-command check + browser walkthrough · §3 endpoints · §4 data model and **requirement-by-requirement conformity table** · §5 architecture · §6 tests per file · §7 env vars · §8 security and known limitations · §9 out of scope.

## Ground rule of the architecture

Strapi owns data, business rules and permissions. Next.js renders pages and forwards user actions with the user's JWT; it never queries PostgreSQL and never makes authorization decisions (its login redirects are UX only).

## Running the app (Docker)

The solution is fully dockerized: `docker-compose.yml` runs PostgreSQL 16, Strapi (built from `backend/Dockerfile`) and Next.js (built from `frontend/Dockerfile`). The `strapi` and `web` services are in the `full` profile; healthchecks enforce the order postgres → strapi → web, and Next.js reaches Strapi at `http://strapi:1337`.

```bash
./scripts/setup-env.sh                              # creates backend/.env (random secrets) + frontend/.env.local
docker compose --profile full up --build            # site :3000, Strapi :1337 (/admin); first build ~10 min
docker compose --profile full ps                    # status
docker compose logs -f strapi                       # logs (or web, postgres)
docker compose --profile full down -v && docker compose --profile full up -d   # reset to clean demo data
docker compose --profile tools up -d adminer       # optional DB viewer on :8080 (server postgres, user/pass strapi/strapi, db communaute)
```

The `web` container runs `next build` at startup because the build prerenders the static shell from Strapi data. Demo data is seeded by Strapi on an empty database.

## Tests and checks

Run on the host with Node.js 20/22 (`npm install` in `backend/` and `frontend/`, `npx playwright install chromium` once), against the running Docker containers:

```bash
./scripts/check-api.sh                     # API walkthrough, curl only (39 checks)
cd backend  && npm test                    # Jest + supertest on a real Strapi; separate DB `communaute_test` dropped/recreated each run
cd backend  && npx tsc --noEmit
cd frontend && npm test                    # Vitest + Testing Library
cd frontend && npm run typecheck && npx eslint .
cd frontend && npm run test:e2e            # Playwright against http://localhost:3000; WRITES "Test E2E …" discussions and votes to the demo DB
```

Expected at delivery: backend 48, frontend 28, E2E 16 — all passing.

Demo users (end users, not admins): `Thomas_PEA`, `Vincent_ETF`, `Claire_Nantes`, `LaRedaction`… password `Demo1234!`.

## Where things are

Backend (`backend/src`):
- `api/{category,discussion,reply,vote}/content-types/*/schema.json` — data model (draftAndPublish off; `repliesCount` and `usefulCount` denormalised; `bestReply` relation on Discussion).
- `api/*/validation.ts` — yup schemas (`@strapi/utils`), the authoritative validation.
- `api/*/services/*.ts` — business logic with the Document Service API; returns DTOs (never the full User).
- `api/*/controllers/*.ts` — thin HTTP layer; `api/*/routes/*.ts` — only needed actions exposed + policies.
- `policies/is-authenticated.ts`, `policies/is-not-impersonating.ts` — global policies on `create`; `api/reply/policies/is-not-own-reply.ts` and `api/discussion/policies/is-discussion-author.ts` for the « Utile » votes and best answer.
- `api/vote` (content type, unique `key` = `voter:reply`) and `api/member` (API without content type: public profile).
- `bootstrap/permissions.ts` (role permissions as code), `bootstrap/indexes.ts`, `bootstrap/seed.ts` (+ `data/seed/*.json`).
- `tests/` — `unit/` (validation, policies) and `api/` (`discussions.test.ts`: the brief's required cases; `community.test.ts`: votes, best answer, member profile).

Frontend (`frontend/src`):
- `lib/strapi/client.ts` (single typed fetch, `StrapiError`), `queries.ts` (`'use cache'` + `cacheTag`), `types.ts`.
- `lib/auth/session.ts` — JWT in an httpOnly cookie, `getCurrentUser()`.
- `app/actions/*` — Server Actions (login/logout, createDiscussion, createReply, toggleUseful, chooseBestReply) calling `updateTag` after writes; the cache tag to invalidate comes from Strapi's response, not from form fields.
- `components/discussions/{ReplyList,UsefulButton,BestReplyButton}.tsx` — best answer shown first; vote and best-answer buttons depend on the viewer (read in a `<Suspense>`d dynamic part of the detail page).
- `app/` routes: `/`, `/discussions/[slug]`, `/nouvelle-discussion`, `/connexion`, `/membres/[username]`.

## Things that look odd but are intentional

- **Next.js 16 differs from older versions** (Cache Components on by default, `'use cache'`, `cacheLife`, `updateTag`, async `params`, `PageProps<'/route'>`). Check `frontend/node_modules/next/dist/docs/` before changing data fetching or caching. Request-time data is wrapped in `<Suspense>` on purpose.
- The impersonation policy throws `errors.PolicyError`: it is the only 403 whose message Strapi keeps (other `ForbiddenError`s are replaced by a generic "Forbidden").
- The API's `publishedAt` field is sourced from `createdAt`: with Draft & Publish off, Strapi rewrites `publishedAt` on every update (including admin edits), while `createdAt` never changes. Sorting uses `createdAt` too.
- `repliesCount` is updated with `strapi.db.query()` (Query Engine) so the counter update does not go through the Document Service publication logic.
- Votes are unique per member and reply through the `votes.key` unique index (`voter:reply`); concurrent clicks never create two votes.
- `createForAuthor` retries with a random slug suffix on a unique-index violation (concurrent identical titles).
- Categories have a custom read-only controller that ignores client `populate`/`fields` (no raw discussions through the inverse relation).
- `process.env.TZ = 'UTC'` in `src/index.ts`: columns are `timestamp without time zone`, so the process timezone must be fixed.
- `config/plugins.ts` uses `jwtManagement: 'legacy-support'` (7-day JWT): the Next server keeps the token; the default "refresh" mode sets a Secure cookie that fails over HTTP in production.
- Unauthenticated writes return 403 (Public role lacks the permission, checked before policies), so `is-authenticated` is defence in depth and is covered by unit tests in `backend/tests/unit/policies.test.ts`. Known limitations are listed in the README §8.
- Login redirects go through `frontend/src/lib/safe-redirect.ts` (rejects `\`, control characters, other origins).

## Conventions

TypeScript strict on both sides. Code comments and UI copy are in French. Keep controllers thin, put logic in services, and add a test in `backend/tests/api` for any new rule.
