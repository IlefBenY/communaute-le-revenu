# Communauté Le Revenu

Espace communautaire où les lecteurs du Revenu posent des questions et partagent leurs expériences. Ce dépôt transforme une partie de la maquette HTML en application **Next.js (App Router) + Strapi v5 + PostgreSQL**.

| Périmètre | Statut |
|---|---|
| Accueil : liste, filtre par catégorie, tri par date, navigation vers le détail | Fait |
| Détail : URL propre (`/discussions/<slug>`), réponses, publication d'une réponse | Fait |
| Création : validation (titre ≥ 10 caractères, contenu, catégorie, type) côté Strapi **et** côté front, redirection | Fait |
| Utilisateurs & permissions : auteur forcé côté serveur, refus des non-authentifiés, anti-usurpation | Fait |
| Bonus : recherche, pagination, tri « plus de réponses », Playwright, Docker Compose | Fait |
| Bonus non réalisés : votes « Utile », meilleure réponse, profil utilisateur | — |

---

## 1. Lancer le projet

### Prérequis

- Node.js 20 ou 22 et npm
- Docker (pour PostgreSQL)
- `openssl` (génération des secrets, présent par défaut sur macOS/Linux)

### Installation (développement local)

```bash
# 1. Variables d'environnement (secrets Strapi générés automatiquement)
./scripts/setup-env.sh

# 2. Base PostgreSQL
docker compose up -d

# 3. Backend Strapi : http://localhost:1337 (admin : /admin)
cd backend
npm install
npm run develop

# 4. Frontend Next.js : http://localhost:3000 (dans un autre terminal)
cd frontend
npm install
npm run dev
```

Au premier démarrage sur une base vide, Strapi insère les **données de démonstration** issues de la maquette : 11 catégories, 18 membres, 20 discussions et 48 réponses (`backend/data/seed/*.json`, désactivable avec `SEED_DEMO_DATA=false`). Il applique aussi les permissions des rôles (voir §3).

Le compte administrateur Strapi se crée à la première visite de `/admin`. Il n'est pas nécessaire pour utiliser l'application.

### Comptes de démonstration

Tous les membres ont le mot de passe **`Demo1234!`**. Par exemple : `Thomas_PEA`, `Vincent_ETF`, `Claire_Nantes`, `LaRedaction`.

### Stack complète avec Docker (bonus)

```bash
./scripts/setup-env.sh
docker compose --profile full up --build
# → http://localhost:3000 (front) et http://localhost:1337 (Strapi)
```

Le conteneur Next.js lance son build au démarrage, une fois Strapi prêt : le build prérend le shell statique des pages à partir des données Strapi.

### Réinitialiser les données

```bash
docker compose down -v && docker compose up -d   # supprime le volume PostgreSQL
```

---

## 2. Tests

| Commande | Contenu |
|---|---|
| `cd backend && npm test` | **Jest + supertest** sur une instance Strapi complète, branchée sur une base PostgreSQL dédiée (`communaute_test`) recréée à chaque exécution. Prérequis : `docker compose up -d`. |
| `cd frontend && npm test` | **Vitest + Testing Library** : composants (carte, liste, état vide), rendu du contenu, validation, paramètres d'URL. |
| `cd frontend && npm run test:e2e` | **Playwright** : parcours complets sur desktop et mobile. Prérequis : Strapi démarré. Le front est lancé automatiquement s'il ne tourne pas déjà. Ces tests créent des discussions préfixées « Test E2E » dans la base de développement. |

Cas couverts, tels que demandés par l'énoncé :

- **Validation d'une discussion** : titre < 10 caractères, contenu vide, type ou catégorie invalides → `400` avec erreurs par champ (backend et unitaire) ; messages d'erreur et saisie conservée dans le formulaire (E2E).
- **Refus d'une publication non authentifiée** : discussion et réponse → `403` exact (backend), la policy `is-authenticated` étant testée isolément ; redirection vers la connexion (E2E).
- **Protection contre l'usurpation d'auteur** : `author` d'un autre utilisateur, par `id`, `documentId` ou objet → `403` avec message explicite, pour les discussions **et** les réponses ; la policy est aussi testée unitairement.
- **Affichage des discussions** : contrat de l'API (champs, pagination, pas d'e-mail exposé), filtre et tri (backend) ; carte, liste et état vide (unitaire) ; accueil, filtre, tri et détail (E2E).

Lors de la livraison : backend 20/20, frontend 10/10, E2E 11/11.

---

## 3. Architecture backend (Strapi v5)

### Modèle de données

```
Category (name unique, slug, description, color)
   1 ── n  Discussion (title 10–160, slug unique, content, type: question|discussion, repliesCount)
                n ── 1  User (plugin Users & Permissions)
                1 ── n  Reply (content ≤ 5000)  n ── 1  User
```

- `draftAndPublish` est désactivé : une publication est immédiatement visible. La **date de publication exposée est `createdAt`** : sans Draft & Publish, Strapi réécrit `publishedAt` à chaque mise à jour (y compris depuis l'admin), alors que `createdAt` est immuable. Un test le vérifie.
- **`repliesCount` est dénormalisé** : il permet l'affichage et le tri « plus de réponses » sans `COUNT` ni jointure sur chaque ligne de la liste. Il est recalculé à chaque nouvelle réponse via la Query Engine, pour ne pas déclencher la logique de publication du Document Service.
- Index supplémentaires créés au bootstrap : `created_at` et `replies_count` pour les tris, unicité de `slug`. Deux créations simultanées du même titre ne provoquent pas d'erreur : la violation d'unicité est interceptée et le slug reçoit un suffixe (testé). Strapi indexe déjà les tables de liaison des relations.

### API exposée

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/discussions?category=&sort=recent\|oldest\|popular&q=&page=&pageSize=` | Public | Liste paginée, filtrée et triée côté serveur |
| GET | `/api/discussions/slug/:slug` | Public | Détail et réponses (route personnalisée) |
| GET | `/api/discussions/:documentId` | Public | Détail par identifiant |
| POST | `/api/discussions` | Authentifié | Création |
| POST | `/api/replies` | Authentifié | Réponse à une discussion |
| GET | `/api/categories`, `/api/categories/:documentId` | Public | Catégories (champs publics uniquement, `populate` ignoré) |

Les routes non nécessaires (update, delete, liste brute des réponses…) ne sont pas exposées (`only: [...]` dans les routers).

### Où vit la logique métier

- **Controllers** (`src/api/*/controllers`) : ils valident l'entrée, appellent le service et fixent le statut HTTP (`201` à la création).
- **Validation** (`src/api/*/validation.ts`) : schémas yup fournis par `@strapi/utils`. Les entrées inconnues sont retirées et toutes les erreurs sont renvoyées d'un coup, au format d'erreur standard de Strapi. Les contraintes `minLength`/`maxLength` du schéma restent une seconde barrière.
- **Services** (`src/api/*/services`) : ils utilisent le **Document Service API**. Les relations sont chargées en une requête, avec uniquement les colonnes utiles (`populate` + `fields`). Le slug est rendu unique. L'auteur est **toujours** `ctx.state.user`. Les réponses passent par des DTO, ce qui évite d'exposer l'objet User (e-mail, provider…).
- **Policies globales** (`src/policies`) :
  - `is-authenticated` : défense en profondeur. En fonctionnement normal elle ne se déclenche pas, car Strapi refuse d'abord la requête (`403`, permission absente du rôle Public). Elle ne sert que si quelqu'un ouvrait par erreur la permission `create` au rôle Public ; elle renvoie alors `401`. Elle est testée unitairement ;
  - `is-not-impersonating` : renvoie un `403` explicite si `author` désigne un autre utilisateur. Elle lève une `PolicyError`, la seule erreur `403` dont Strapi conserve le message.
- **Permissions** (`src/bootstrap/permissions.ts`) : elles sont versionnées dans le code et appliquées au démarrage de façon idempotente. Public = lecture ; Authenticated = lecture + création de discussions et de réponses.
- **JWT** (`config/plugins.ts`) : mode `legacy-support` avec une durée de 7 jours, alignée sur le cookie de session côté Next.js. Le mode `refresh` généré par défaut ne convient pas ici : Strapi y pose lui-même un cookie `Secure` destiné au navigateur, ce qui provoque une erreur 500 en HTTP en production.
- **Fuseau horaire** : le processus Strapi tourne en UTC (`src/index.ts`). Les colonnes sont en `timestamp without time zone`, donc sans cela deux environnements à fuseaux différents (poste local et conteneur) écriraient des dates décalées.

### Codes HTTP

| Code | Cas |
|---|---|
| `400` | Validation (`ValidationError`, détails par champ) ou paramètres de liste invalides |
| `401` / `403` | Non authentifié (Strapi renvoie `403` au rôle Public sans permission), usurpation |
| `404` | Discussion inconnue |
| `405` | Méthode non exposée |

---

## 4. Architecture frontend (Next.js 16)

```
src/
├── app/
│   ├── page.tsx                      # Accueil (liste, filtres, tri, pagination)
│   ├── discussions/[slug]/           # Détail, not-found dédié
│   ├── nouvelle-discussion/          # Création (accès connecté)
│   ├── connexion/                    # Connexion (comptes de démo)
│   ├── actions/                      # Server Actions : login/logout, création, réponse
│   ├── error.tsx, not-found.tsx
├── components/{layout,discussions,auth,ui}/
└── lib/
    ├── strapi/{client,queries,types}.ts   # Accès Strapi centralisé et typé
    ├── auth/session.ts                    # Cookie httpOnly, utilisateur courant
    ├── validation.ts, params.ts, format.ts
```

### Rendu et récupération des données

- **Server Components par défaut.** Toutes les lectures Strapi se font côté serveur via `lib/strapi`, seul point d'accès à l'API (`server-only`). L'URL de Strapi et les JWT ne sont jamais exposés au navigateur.
- **Client Components limités à l'interactif** : formulaires (`useActionState`, `useFormStatus`), lecture de l'URL pour la catégorie active et la recherche.
- **Cache Components** (activé par défaut dans Next 16). Les lectures publiques sont mises en cache avec `'use cache'` et des tags : `getDiscussions` et `getDiscussionBySlug` (`cacheLife('minutes')`), `getCategories` (`hours`). Après une réponse, le tag invalidé vient de la réponse de Strapi, pas d'un champ du formulaire. Les parties qui dépendent de la requête (`searchParams`, cookie de session) sont isolées dans des `<Suspense>`. Le shell de chaque page est ainsi prérendu et le reste streamé, avec un squelette de chargement.
- **Actualisation après mutation** : les Server Actions appellent `updateTag(...)` (« read-your-own-writes »). L'auteur voit immédiatement sa discussion ou sa réponse, puis est redirigé vers la discussion créée.
- **État dans l'URL** : catégorie, tri, recherche et page sont des paramètres d'URL. Les liens sont partageables, le bouton retour fonctionne et la navigation n'a pas besoin de JavaScript.

### Authentification

La connexion appelle `POST /api/auth/local` depuis une Server Action. Le JWT est stocké dans un **cookie httpOnly**, `SameSite=Lax` et `Secure` en production, puis transmis à Strapi en `Authorization: Bearer`. Next.js ne prend **aucune décision d'autorisation** : il redirige seulement vers la connexion pour l'ergonomie, et Strapi reste l'unique garant des droits.

### États et erreurs

- Chargement : squelettes via `<Suspense>`.
- Absence de données : `EmptyState`, avec appel à l'action.
- Ressource inconnue : `not-found.tsx` dédié.
- Erreur Strapi ou réseau : `error.tsx`, avec bouton « Réessayer ». `StrapiError` normalise les erreurs et ramène les erreurs de validation au niveau de chaque champ du formulaire.
- Formulaires : la saisie est conservée en cas d'erreur, les erreurs sont reliées aux champs (`aria-invalid`, `aria-describedby`) et le bouton est désactivé pendant l'envoi.

### Design

Les tokens de la maquette sont repris en variables CSS et thème Tailwind v4 : rouge `#eb0f0f`, encre, surfaces, filets, en **clair et sombre** (`prefers-color-scheme`). Polices Playfair Display et Inter via `next/font`. La mise en page est responsive : barre latérale des espaces sur desktop, carrousel de catégories sur mobile, et un test E2E vérifie l'absence de défilement horizontal.

### Bibliothèques ajoutées

| Bibliothèque | Pourquoi |
|---|---|
| `server-only` | Garantit à la compilation que le client Strapi et la session ne sont jamais embarqués côté navigateur |
| `jest`, `ts-jest`, `supertest`, `dotenv` (backend) | Tests d'API sur une vraie instance Strapi |
| `vitest`, `@testing-library/react`, `jsdom` | Tests de composants rapides |
| `@playwright/test` | Tests end-to-end desktop et mobile |

Aucune bibliothèque de validation ou de requêtes n'a été ajoutée côté front : les Server Actions et `fetch` suffisent, et la validation qui fait foi est celle de Strapi.

---

## 5. Pistes d'évolution

- Votes « Utile » et meilleure réponse : content type `Vote` avec contrainte d'unicité (user, reply), et `bestReply` sur Discussion, modifiable uniquement par l'auteur (policy `is-owner`).
- Profil utilisateur : page `/membres/[username]`, avec une extension du modèle User (bio, avatar).
- Invalidation du cache déclenchée par Strapi : webhook vers une route Next.js qui appelle `revalidateTag` quand un contenu est modifié depuis l'admin.
- Recherche plein texte PostgreSQL (`tsvector` + index GIN) à la place de `$containsi` quand le volume augmentera.
- Rate limiting des publications et modération (signalements, masquage).
- Compteur de réponses mis à jour par un `UPDATE ... SET replies_count = replies_count + 1` atomique, ou par un trigger, si la concurrence d'écriture devient forte.
- Pagination des réponses sur le détail (aujourd'hui toutes les réponses sont chargées).
- Inscription : l'endpoint natif `/api/auth/local/register` de Strapi reste ouvert (réglage par défaut, sans confirmation d'e-mail). À activer avec confirmation, ou à fermer, selon le besoin produit.
- Déconnexion : le cookie est supprimé, mais le JWT (sans état) reste valide jusqu'à expiration (7 jours). Une liste de révocation ou des jetons courts avec refresh token côté serveur règleraient ce point.
