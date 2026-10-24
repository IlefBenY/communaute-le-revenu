# Communauté Le Revenu — Next.js 16 + Strapi 5 + TypeScript + PostgreSQL

Espace communautaire des lecteurs du Revenu, issu de la maquette HTML : liste des discussions
filtrable et triable → détail avec réponses → création d'une discussion → publication d'une
réponse, avec utilisateurs, permissions et protection contre l'usurpation d'auteur.

**Strapi porte toute la logique métier et les droits** ; Next.js affiche les pages et transmet les
actions de l'utilisateur avec son JWT, sans jamais accéder à PostgreSQL. Les bonus réalisés :
recherche, pagination, votes « Utile », meilleure réponse, profil membre, tests Playwright et
solution entièrement dockerisée.

---

## 1. Démarrage rapide

La solution est **entièrement dockerisée** : une commande démarre PostgreSQL, Strapi et Next.js,
chacun dans son conteneur. Seuls Docker et `openssl` sont nécessaires.

```bash
./scripts/setup-env.sh                    # crée backend/.env (secrets générés) et frontend/.env.local
docker compose --profile full up --build  # build des images + PostgreSQL + Strapi + Next.js
docker compose logs -f strapi             # suivre le démarrage
```

- Site : http://localhost:3000 · API : http://localhost:1337/api · Admin Strapi : http://localhost:1337/admin
- Premier lancement : environ 10 minutes (build du panneau d'administration Strapi), puis quelques secondes.
- Ordre de démarrage garanti par des *healthchecks* : PostgreSQL → Strapi → Next.js.
  Next.js appelle Strapi par le réseau Docker interne (`http://strapi:1337`).
- Au premier démarrage, Strapi insère les **données de démonstration** de la maquette : 11 catégories,
  18 membres, 20 discussions, 48 réponses, des votes « Utile » et des meilleures réponses.

**Comptes de démonstration** (mot de passe commun **`Demo1234!`**) : `Thomas_PEA`, `Claire_Nantes`,
`Vincent_ETF`, `LaRedaction`…

```
  navigateur ──▶ web (Next.js) ──▶ strapi (Strapi 5) ──▶ postgres (PostgreSQL 16)
                 :3000             :1337                 :5432 · volume pgdata
```

Arrêt / remise à zéro complète (supprime le volume PostgreSQL et recrée les données de démo) :

```bash
docker compose --profile full down
docker compose --profile full down -v && docker compose --profile full up -d
```

### Visualiser la base (Adminer)

Service optionnel, hors du chemin par défaut : il ne démarre qu'avec le profil `tools`.

```bash
docker compose --profile tools up -d adminer   # http://localhost:8080
docker compose --profile tools stop adminer
```

| Champ | Valeur |
|---|---|
| Système | PostgreSQL |
| Serveur | `postgres` (pré-rempli) |
| Utilisateur / Mot de passe | `strapi` / `strapi` |
| Base | `communaute` |

Tables utiles : `categories`, `discussions`, `replies`, `votes`, `up_users`, `up_roles`, `up_permissions`
(+ les tables de liaison `*_lnk` générées par Strapi pour les relations).

### Créer un administrateur Strapi

Premier lancement : formulaire sur http://localhost:1337/admin. En ligne de commande :

```bash
docker compose exec strapi npm run strapi -- admin:create-user \
  --firstname=Admin --lastname=Test --email=admin@example.com --password='Admin1234!'
```

Le compte administrateur n'est pas nécessaire pour utiliser le site : les membres de démo suffisent.

---

## 2. Parcours de test en une commande

```bash
./scripts/check-api.sh          # nécessite seulement curl + l'application démarrée
```

Le script déroule et **vérifie** les exigences de l'énoncé directement sur l'API Strapi, sans passer
par le site : catégories → liste paginée, triée et filtrée → détail par slug → publication refusée
sans connexion → validation (titre < 10, contenu vide, type et catégorie invalides) → usurpation
d'auteur refusée → création → réponse et compteur → vote « Utile » (refusé sur sa propre réponse) →
meilleure réponse (réservée à l'auteur) → profil membre sans e-mail.

Sortie attendue (39 vérifications) :

```
== 4. Publication refusée sans connexion (§2.D)
   ok création sans JWT (403)
== 6. Usurpation d'auteur refusée (§2.D)
   ok author = autre utilisateur (403)
   ok message explicite
== 7. Création d'une discussion (§2.C)
   ok discussion créée (201)
   ok auteur = utilisateur du JWT
...
Parcours complet OK
```

Le script crée une discussion « Vérification automatique … », une réponse et un vote ; la remise à
zéro (§1) restaure les données d'origine.

### Le même parcours dans le navigateur

| # | Énoncé | À faire sur http://localhost:3000 | Résultat attendu |
|---|---|---|---|
| 1 | §2.A | Ouvrir l'accueil | Discussions venant de Strapi : titre, auteur, catégorie, nombre de réponses, date |
| 2 | §2.A | Cliquer « Bourse & actions », puis « Plus anciennes » | Liste filtrée puis triée par date ; l'URL reflète l'état |
| 3 | §2.B | Ouvrir « Ouvrir un PEA avec 5 000 € : par où commencer ? » | URL propre, contenu, auteur, date, catégorie, réponses |
| 4 | §2.D | Sans être connecté : tenter de répondre, ouvrir `/nouvelle-discussion` | Invitation à se connecter, redirection vers `/connexion` |
| 5 | §2.B | Se connecter en `Claire_Nantes`, publier une réponse | Réponse visible immédiatement, compteur à jour |
| 6 | §2.C | « Nouvelle discussion » avec le titre `Court` et un contenu vide | Erreurs sous chaque champ, saisie conservée |
| 7 | §2.C | Titre de 10 caractères ou plus, catégorie, type, contenu | Redirection vers la nouvelle discussion, en tête de l'accueil |
| 8 | Bonus | Cliquer « Utile » sous une réponse d'un autre membre | Bouton vert, compteur +1 ; un second clic annule |
| 9 | Bonus | Se connecter en `Thomas_PEA` (auteur de « Ouvrir un PEA… »), choisir une meilleure réponse | La réponse passe en tête avec le badge « Meilleure réponse » |
| 10 | Bonus | Cliquer sur un pseudo | Profil public `/membres/<pseudo>` avec statistiques |
| 11 | Bonus | Rechercher « PEA », puis « zzzz » | Résultats filtrés, puis « Aucun résultat » |

Les mêmes données sont consultables dans l'admin Strapi (Content Manager → Category, Discussion,
Reply, Vote, User) et dans Adminer.

---

## 3. Endpoints

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/api/discussions?category=&sort=recent\|oldest\|popular&q=&page=&pageSize=` | Public | Liste paginée, filtrée, triée et recherchée côté serveur (`pageSize ≤ 50`) |
| `GET` | `/api/discussions/slug/:slug` | Public | Détail et réponses (URL propre) |
| `GET` | `/api/discussions/:documentId` | Public | Détail par identifiant |
| `POST` | `/api/discussions` | Authentifié | Création ; l'auteur est celui du JWT |
| `POST` | `/api/replies` | Authentifié | Réponse à une discussion |
| `POST` | `/api/replies/:documentId/useful` | Authentifié | Ajoute ou retire le vote « Utile » |
| `GET` | `/api/replies/useful/mine?discussion=` | Authentifié | Réponses de la discussion que j'ai marquées « Utile » |
| `PUT` | `/api/discussions/:documentId/best-reply` | Auteur de la discussion | Choisit (`{ reply }`) ou retire (`{ reply: null }`) la meilleure réponse |
| `GET` | `/api/members/:username` | Public | Profil public : statistiques, discussions et réponses récentes |
| `GET` | `/api/categories`, `/api/categories/:documentId` | Public | Catégories (champs publics uniquement) |
| `POST` | `/api/auth/local` | Public | Connexion (Users & Permissions) → JWT |

Les autres routes (update, delete, liste brute des réponses ou des utilisateurs) ne sont pas exposées.

Corps de requête :

```jsonc
// POST /api/discussions — author n'est jamais lu : il vient du JWT
{ "data": { "title": "≥ 10 caractères", "content": "…", "type": "question", "category": "bourse" } }
// POST /api/replies
{ "data": { "discussion": "<documentId>", "content": "…" } }
// PUT /api/discussions/:id/best-reply
{ "data": { "reply": "<documentId>" } }          // ou { "reply": null } pour retirer
```

Codes HTTP : `400` validation (détail par champ) · `403` non connecté, usurpation, vote sur sa propre
réponse, meilleure réponse par un non-auteur · `404` ressource inconnue · `405` méthode non exposée.

---

## 4. Modèle de données

```
Category 1──* Discussion *──1 User (Users & Permissions)
                 │  └──0..1 bestReply → Reply
                 └──* Reply *──1 User
                        └──* Vote *──1 User      (clé unique « voter:reply »)
```

| Modèle | Rôle | Points clés |
|---|---|---|
| `Category` | Espace thématique | `name` (unique), `slug` (uid), `description`, `color` |
| `Discussion` | Sujet ouvert par un membre | `title` (10–160), `slug` (index unique), `content`, `type` (`question` \| `discussion`), `repliesCount`, relations `author`, `category`, `replies`, `bestReply` |
| `Reply` | Réponse à une discussion | `content` (≤ 5000), `usefulCount`, relations `author`, `discussion` |
| `Vote` | Vote « Utile » | `key` = `voter:reply` (index unique), relations `voter`, `reply` |
| `User` | Modèle du plugin Users & Permissions | utilisé tel quel, rôles Public / Authenticated |

`draftAndPublish` est désactivé : une publication est immédiatement visible. `repliesCount` et
`usefulCount` sont dénormalisés pour l'affichage et le tri, et recalculés à chaque écriture.

### Conformité à l'énoncé

| Énoncé | Réalisation |
|---|---|
| §1 Next.js App Router, React, TypeScript, Tailwind | Next.js 16.4, React 19, TypeScript strict, Tailwind v4 |
| §1 Strapi v5, PostgreSQL, TypeScript, REST | Strapi 5.59, PostgreSQL 16, TypeScript strict |
| §1 Next.js n'accède pas à PostgreSQL, pas de backend parallèle | Aucun driver de base côté front ; les Server Actions transmettent seulement à Strapi |
| §2.A Discussions issues de l'API, non codées en dur | Server Components → `GET /api/discussions` ; données de démo dans Strapi |
| §2.A Titre, auteur, catégorie, nombre de réponses, date | `DiscussionCard` |
| §2.A Filtre par catégorie, tri par date | Paramètres `category` et `sort`, appliqués par Strapi |
| §2.B URL propre, détail complet, réponses | `/discussions/[slug]`, slug unique |
| §2.B Réponse enregistrée dans PostgreSQL via Strapi | Server Action → `POST /api/replies` |
| §2.C Titre ≥ 10, contenu requis, catégorie, type | Formulaire + validation yup côté Strapi + contraintes du schéma |
| §2.C Erreurs affichées, redirection vers la discussion créée | Erreurs par champ, `redirect('/discussions/<slug>')` |
| §2.C Validation côté Strapi indépendante du front | Validée par appel direct à l'API (`check-api.sh`, tests backend) |
| §2.D Discussions et réponses liées à un utilisateur | Relation `author` vers le modèle User du plugin |
| §2.D Publication interdite aux non-authentifiés | Permission absente du rôle Public + policy `is-authenticated` |
| §2.D Impossible de publier au nom d'un autre | Policy `is-not-impersonating` (403) + auteur forcé à `ctx.state.user` |
| §2.D Permissions configurées dans Strapi | `src/bootstrap/permissions.ts`, appliquées au démarrage |
| §3 Category (name, slug, description), Discussion, Reply | Voir tableau ci-dessus |
| §3 Relations optimisées, pagination et tri côté backend | `populate` + `fields` ciblés en une requête, `start`/`limit`, tri en liste blanche |
| §3 Validation, autorisations, erreurs HTTP cohérentes | yup, permissions + policies, erreurs Strapi standard |
| §3 Document Service API | Utilisée par tous les services métier |
| §4 Composants réutilisables, appels Strapi centralisés et typés | `components/`, `lib/strapi/{client,queries,types}.ts` |
| §4 Server / Client Components cohérents | Server par défaut ; Client pour les formulaires et la lecture de l'URL |
| §4 États de chargement, erreur, absence de données | Squelettes `<Suspense>`, `error.tsx`, `not-found.tsx`, `EmptyState` |
| §4 Responsive, respect de la maquette | Tokens de la maquette, clair/sombre, mobile vérifié en E2E |
| §5 Bonus | Recherche, votes « Utile », meilleure réponse, pagination, profil, Playwright, Docker Compose |
| §6 Tests demandés | Validation, refus non authentifié, usurpation, affichage : voir §6 |
| §7 Livrables | Dépôt Git, schémas des content types, seed, `.env.example`, README, tests |

Vérification directe en base :

```bash
docker compose exec postgres psql -U strapi -d communaute \
  -c '\d discussions' -c '\d replies' -c '\d votes' -c '\di discussions_*'
```

---

## 5. Architecture

```
backend/src/
├── api/
│   ├── category/                    # controller en lecture seule, champs publics figés
│   ├── discussion/
│   │   ├── content-types/…/schema.json
│   │   ├── validation.ts            # schémas yup (création, paramètres de liste)
│   │   ├── services/discussion.ts   # liste, détail, création, meilleure réponse (Document Service)
│   │   ├── controllers/             # couche HTTP fine
│   │   ├── routes/                  # routes exposées + policies
│   │   └── policies/is-discussion-author.ts
│   ├── reply/                       # réponses, votes « Utile », policy is-not-own-reply
│   ├── vote/                        # content type Vote
│   └── member/                      # API sans content type : profil public
├── policies/                        # is-authenticated, is-not-impersonating
├── bootstrap/                       # permissions, index SQL, données de démo
└── utils/                           # DTO publics, slugify

frontend/src/
├── app/                             # /, /discussions/[slug], /nouvelle-discussion, /connexion, /membres/[username]
│   └── actions/                     # Server Actions : connexion, création, réponse, vote, meilleure réponse
├── components/{layout,discussions,auth,ui}/
└── lib/
    ├── strapi/{client,queries,types}.ts   # accès Strapi centralisé, typé, mis en cache
    ├── auth/session.ts                    # JWT en cookie httpOnly, utilisateur courant
    └── safe-redirect.ts, validation.ts, params.ts, format.ts
```

**Trois règles structurantes :**

1. *Strapi est l'unique garant des droits.* Permissions par rôle, puis policies, puis services :
   l'auteur d'une discussion, d'une réponse ou d'un vote est **toujours** l'utilisateur du JWT, jamais
   une valeur envoyée par le client. Les redirections de Next.js vers la connexion ne sont que de l'ergonomie.
2. *Contrat d'API explicite.* Les services renvoient des DTO : un auteur se réduit à
   `{ id, documentId, username }`, aucun e-mail ni donnée de compte ne sort de l'API.
3. *Un seul point d'accès à Strapi côté front.* `lib/strapi` (marqué `server-only`) centralise les
   appels, le typage et la normalisation des erreurs ; le JWT et l'URL de Strapi ne sont jamais
   exposés au navigateur.

### Rendu et actualisation (Next.js 16)

- **Server Components par défaut**, Client Components limités aux formulaires et à la lecture de l'URL.
- **Cache Components** : les lectures publiques sont mises en cache (`'use cache'`, `cacheLife`,
  `cacheTag`) ; ce qui dépend de la requête (paramètres d'URL, cookie de session) est isolé dans des
  `<Suspense>`. Le shell des pages est prérendu, le reste est streamé avec un squelette de chargement.
- **Après une écriture**, la Server Action appelle `updateTag(...)` : l'utilisateur voit immédiatement
  sa discussion, sa réponse ou son vote. Le tag invalidé vient de la réponse de Strapi, pas du formulaire.
- **État dans l'URL** (catégorie, tri, recherche, page) : liens partageables, bouton retour fonctionnel.

### Authentification

`POST /api/auth/local` depuis une Server Action ; le JWT (7 jours) est stocké dans un **cookie
httpOnly** `SameSite=Lax`, puis transmis à Strapi en `Authorization: Bearer`. Les redirections après
connexion sont limitées au site (`safe-redirect.ts`, anti open redirect).

### Unicité et concurrence

Strapi 5 n'émet pas de contrainte SQL `UNIQUE` pour `unique: true` : `src/bootstrap/indexes.ts` crée
explicitement les index uniques sur `discussions.slug` et `votes.key`, plus des index de tri
(`created_at`, `replies_count`). Deux créations simultanées du même titre obtiennent des slugs
distincts (retry sur violation d'unicité), et des clics simultanés sur « Utile » ne créent qu'un vote.

### Date de publication

Sans Draft & Publish, Strapi réécrit `publishedAt` à chaque mise à jour, y compris depuis l'admin.
La date exposée et le tri utilisent donc `createdAt`, immuable. Le processus Strapi tourne en UTC
(`src/index.ts`) car les colonnes sont en `timestamp without time zone`.

### Bibliothèques ajoutées

| Bibliothèque | Pourquoi |
|---|---|
| `server-only` | Garantit à la compilation que l'accès Strapi et la session ne partent jamais côté navigateur |
| `jest`, `ts-jest`, `supertest`, `dotenv` | Tests d'API sur une vraie instance Strapi |
| `vitest`, `@testing-library/react`, `jsdom` | Tests de composants |
| `@playwright/test` | Tests end-to-end desktop et mobile |

---

## 6. Tests

```bash
./scripts/check-api.sh                     # parcours API (39 vérifications), curl uniquement
cd backend  && npm install && npm test     # 48 tests Jest (API sur une vraie instance Strapi + unitaires)
cd frontend && npm install && npm test     # 28 tests Vitest (composants et utilitaires)
cd frontend && npx playwright install chromium && npm run test:e2e   # 16 tests Playwright
```

Les tests `npm` s'exécutent avec Node.js 20/22 sur la machine, contre les conteneurs démarrés (§1).
Les tests backend utilisent une base dédiée (`communaute_test`), recréée à chaque exécution : les
données de démo ne sont pas touchées. Les tests E2E, eux, écrivent dans la base de démo.

| Fichier | Couverture |
|---|---|
| `backend/tests/api/discussions.test.ts` | **Cas demandés par l'énoncé** : liste (champs, pagination, pas d'e-mail), filtre et tri, détail et 404, refus sans connexion (403), validation (400 par champ), catégorie inexistante, usurpation par `id`/`documentId`/objet (403), création avec l'auteur du JWT, slug unique, réponses, concurrence, date inchangée après modification |
| `backend/tests/api/community.test.ts` | Votes « Utile » (ajout/retrait, un vote malgré des clics simultanés, pas sur sa propre réponse), meilleure réponse (auteur seulement, réponse de la discussion, retrait), profil public sans données de compte |
| `backend/tests/unit/validation.test.ts` | Règles de validation : titre, contenu, type, catégorie, paramètres de liste, slug |
| `backend/tests/unit/policies.test.ts` | Policies `is-authenticated` et `is-not-impersonating`, toutes les formes d'auteur |
| `frontend/tests/unit/discussions.test.tsx` | Affichage d'une discussion (titre, auteur, catégorie, réponses, date), liste, états vides |
| `frontend/tests/unit/community.test.tsx` | Meilleure réponse en tête, boutons « Utile » selon le visiteur, discussion résolue, lien vers le profil |
| `frontend/tests/unit/lib.test.tsx` | Validation du formulaire, paramètres d'URL, rendu sûr du contenu (pas d'HTML interprété) |
| `frontend/tests/unit/safe-redirect.test.ts` | Redirections après connexion : chemins internes acceptés, `//`, `\`, schémas et autres origines refusés |
| `frontend/tests/e2e/*.spec.ts` | Parcours navigateur : accueil, filtre, tri, détail, connexion, validation, création, réponse, vote, meilleure réponse, profil, recherche, mobile sans défilement horizontal |

---

## 7. Variables d'environnement

Voir `backend/.env.example` et `frontend/.env.example` ; `./scripts/setup-env.sh` génère des secrets
aléatoires. Aucun secret n'est commité.

| Variable | Défaut | Rôle |
|---|---|---|
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | générés | Secrets Strapi (signature des JWT, sessions admin) |
| `DATABASE_*` | `127.0.0.1:5432`, base `communaute`, utilisateur `strapi` | Connexion PostgreSQL (hôte `postgres` dans Docker) |
| `DATABASE_TEST_NAME` | `communaute_test` | Base des tests backend, recréée à chaque exécution |
| `SEED_DEMO_DATA` | `true` | Données de démonstration au premier démarrage (idempotent) |
| `STRAPI_URL` | `http://127.0.0.1:1337` | URL de Strapi vue par le serveur Next.js (`http://strapi:1337` dans Docker) |
| `COOKIE_SECURE` | — | `false` pour servir le build de production en HTTP (fixé ainsi dans Docker) |
| `ADMINER_PORT` | `8080` | Port d'Adminer (profil `tools`) |

---

## 8. Sécurité et limites assumées

- Un visiteur qui tente d'écrire reçoit `403` (et non `401`) : Strapi vérifie la permission du rôle
  Public avant les policies. La policy `is-authenticated` reste une défense en profondeur si cette
  permission était ouverte par erreur.
- Une discussion inconnue affiche la page « introuvable », mais avec un code HTTP `200` : la page est
  streamée et le statut est envoyé avant la vérification.
- La déconnexion supprime le cookie, mais le JWT (sans état) reste valide jusqu'à son expiration
  (7 jours) → liste de révocation ou jetons courts avec refresh token côté serveur.
- L'inscription native de Strapi (`/api/auth/local/register`) reste ouverte, sans confirmation d'e-mail
  (réglage par défaut) → à activer avec confirmation ou à fermer selon le besoin produit.
- Une modification depuis l'admin Strapi apparaît sur le site au plus tard à l'expiration du cache
  (environ une minute) → webhook Strapi vers `revalidateTag`.
- Recherche par `ILIKE` (`$containsi`) → recherche plein texte PostgreSQL (`tsvector` + index GIN) quand
  le volume augmentera.
- Les réponses d'une discussion ne sont pas paginées ; les compteurs sont recalculés (et non incrémentés
  atomiquement) → `UPDATE … SET n = n + 1` ou trigger si la concurrence d'écriture devient forte.
- Le conteneur Next.js lance son build au démarrage (il prérend à partir des données Strapi) → build en
  CI et image multi-étapes en production.

## 9. Hors périmètre

Page d'inscription, notifications et @mentions, sondages, billets de blog, classement, badges et
points, événements, signalement et modération, newsletter — fonctionnalités présentes dans la maquette
mais hors de l'énoncé.
