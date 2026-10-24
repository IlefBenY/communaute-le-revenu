# Communauté Le Revenu

Espace communautaire où les lecteurs du Revenu posent des questions et partagent leurs expériences. Ce dépôt transforme une partie de la maquette HTML en application **Next.js (App Router) + Strapi v5 + PostgreSQL**.

| Périmètre | Statut |
|---|---|
| Accueil : liste, filtre par catégorie, tri par date, navigation vers le détail | Fait |
| Détail : URL propre (`/discussions/<slug>`), réponses, publication d'une réponse | Fait |
| Création : validation (titre ≥ 10 caractères, contenu, catégorie, type) côté Strapi **et** côté front, redirection | Fait |
| Utilisateurs & permissions : auteur forcé côté serveur, refus des non-authentifiés, anti-usurpation | Fait |
| Bonus : recherche, pagination, tri « plus de réponses » | Fait |
| Bonus : votes « Utile », meilleure réponse, profil utilisateur | Fait |
| Bonus : tests end-to-end Playwright | Fait |
| Bonus : solution dockerisée (Docker Compose : PostgreSQL + Strapi + Next.js) | Fait |

---

## 1. Lancer le projet

La solution est **entièrement dockerisée** : une seule commande démarre la base PostgreSQL, le backend Strapi et le frontend Next.js, chacun dans son conteneur. Docker suffit, sans installer Node.js ni PostgreSQL sur la machine.

```
docker compose --profile full up

  navigateur ──▶ web (Next.js)     ──▶ strapi (Strapi v5) ──▶ postgres (PostgreSQL 16)
                 :3000                  :1337                   :5432, volume pgdata
                 STRAPI_URL=http://strapi:1337   (réseau Docker interne)
```

Deux modes sont proposés, selon l'usage :

| | **A. Tout dans Docker** (recommandé pour évaluer) | **B. Développement local** |
|---|---|---|
| Pour | Lancer et tester l'application telle qu'elle serait livrée | Modifier le code et lancer les tests automatisés |
| Dans Docker | PostgreSQL + Strapi + Next.js | PostgreSQL uniquement |
| Sur la machine | rien | Strapi et Next.js, avec rechargement instantané à chaque modification |
| Prérequis | Docker | Docker + Node.js 20/22 |

Les deux modes partagent la même configuration (`backend/.env`, `frontend/.env.local`) et la même base PostgreSQL.

### Prérequis

- Docker (Docker Desktop sur macOS/Windows)
- `openssl` (génération des secrets, présent par défaut sur macOS/Linux)
- Mode B uniquement : Node.js 20 ou 22 et npm

### A. Tout dans Docker (recommandé)

```bash
# 1. Variables d'environnement (secrets Strapi générés automatiquement)
./scripts/setup-env.sh

# 2. Construction et démarrage des 3 conteneurs
docker compose --profile full up --build
```

Le site est sur http://localhost:3000, et Strapi sur http://localhost:1337 (administration : `/admin`).

- **Premier lancement :** environ 10 minutes, le temps de construire le panneau d'administration Strapi. Les lancements suivants prennent quelques secondes.
- **Ordre de démarrage :** il est garanti par des *healthchecks*. Strapi attend que PostgreSQL accepte les connexions, puis Next.js attend que l'API Strapi réponde.
- **Build de Next.js :** le conteneur Next.js lance son build au démarrage, une fois Strapi prêt, car le build prérend le shell statique des pages à partir des données Strapi.
- **Communication entre conteneurs :** Next.js appelle Strapi par le nom du service (`http://strapi:1337`) sur le réseau Docker interne. Les données PostgreSQL sont conservées dans le volume `pgdata`.

| Action | Commande |
|---|---|
| Démarrer en arrière-plan | `docker compose --profile full up -d` |
| Voir l'état des conteneurs | `docker compose --profile full ps` |
| Suivre les logs | `docker compose logs -f strapi` (ou `web`, `postgres`) |
| Arrêter (données conservées) | `docker compose --profile full down` |
| Repartir de données propres | `docker compose --profile full down -v && docker compose --profile full up -d` |

### B. Développement local

Seul PostgreSQL tourne dans Docker. Strapi et Next.js tournent sur la machine pour un rechargement instantané. Le profil `full` n'étant pas activé, `docker compose up -d` ne démarre que la base.

```bash
# 1. Variables d'environnement (si ce n'est pas déjà fait)
./scripts/setup-env.sh

# 2. Base PostgreSQL seule
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

Si la stack Docker complète tourne déjà, arrêtez d'abord ses conteneurs applicatifs, qui occupent les ports 1337 et 3000 : `docker compose --profile full stop strapi web`.

### Données et comptes de démonstration

Au premier démarrage sur une base vide (dans les deux modes), Strapi insère les **données de démonstration** issues de la maquette : 11 catégories, 18 membres, 20 discussions, 48 réponses, des votes « Utile » et des meilleures réponses (`backend/data/seed/*.json`, désactivable avec `SEED_DEMO_DATA=false`). Il applique aussi les permissions des rôles (voir §3).

Tous les membres ont le mot de passe **`Demo1234!`**. Par exemple : `Thomas_PEA`, `Vincent_ETF`, `Claire_Nantes`, `LaRedaction`.

Le compte administrateur Strapi se crée à la première visite de `/admin`. Il n'est pas nécessaire pour utiliser l'application.

### Réinitialiser les données

```bash
docker compose --profile full down -v   # supprime le volume PostgreSQL (toutes les données)
docker compose --profile full up -d     # mode A ; en mode B : docker compose up -d
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

Lors de la livraison : backend 48/48, frontend 28/28, E2E 16/16.

---

## 3. Architecture backend (Strapi v5)

### Modèle de données

```
Category (name unique, slug, description, color)
   1 ── n  Discussion (title 10–160, slug unique, content, type: question|discussion, repliesCount)
                n ── 1  User (plugin Users & Permissions)
                n ── 1  bestReply → Reply (meilleure réponse, optionnelle)
                1 ── n  Reply (content ≤ 5000, usefulCount)  n ── 1  User
                               1 ── n  Vote (key unique « voter:reply »)  n ── 1  User
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
| POST | `/api/replies/:documentId/useful` | Authentifié | Ajoute ou retire le vote « Utile » (pas sur sa propre réponse) |
| GET | `/api/replies/useful/mine?discussion=` | Authentifié | Réponses de la discussion que j'ai marquées « Utile » |
| PUT | `/api/discussions/:documentId/best-reply` | Auteur de la discussion | Choisit (`{ reply }`) ou retire (`{ reply: null }`) la meilleure réponse |
| GET | `/api/members/:username` | Public | Profil public : statistiques, discussions et réponses récentes |

Les routes non nécessaires (update, delete, liste brute des réponses…) ne sont pas exposées (`only: [...]` dans les routers).

### Où vit la logique métier

- **Controllers** (`src/api/*/controllers`) : ils valident l'entrée, appellent le service et fixent le statut HTTP (`201` à la création).
- **Validation** (`src/api/*/validation.ts`) : schémas yup fournis par `@strapi/utils`. Les entrées inconnues sont retirées et toutes les erreurs sont renvoyées d'un coup, au format d'erreur standard de Strapi. Les contraintes `minLength`/`maxLength` du schéma restent une seconde barrière.
- **Services** (`src/api/*/services`) : ils utilisent le **Document Service API**. Les relations sont chargées en une requête, avec uniquement les colonnes utiles (`populate` + `fields`). Le slug est rendu unique. L'auteur est **toujours** `ctx.state.user`. Les réponses passent par des DTO, ce qui évite d'exposer l'objet User (e-mail, provider…).
- **Policies globales** (`src/policies`) :
  - `is-authenticated` : défense en profondeur. En fonctionnement normal elle ne se déclenche pas, car Strapi refuse d'abord la requête (`403`, permission absente du rôle Public). Elle ne sert que si quelqu'un ouvrait par erreur la permission `create` au rôle Public ; elle renvoie alors `401`. Elle est testée unitairement ;
  - `is-not-impersonating` : renvoie un `403` explicite si `author` désigne un autre utilisateur. Elle lève une `PolicyError`, la seule erreur `403` dont Strapi conserve le message ;
  - `api::reply.is-not-own-reply` : interdit de voter « Utile » pour sa propre réponse ;
  - `api::discussion.is-discussion-author` : seul l'auteur de la discussion choisit la meilleure réponse.
- **Votes « Utile »** : un content type `Vote` dont la clé `voter:reply` porte un index unique en base. Même des clics simultanés ne créent qu'un vote (testé). Le compteur `usefulCount` est recalculé après chaque vote.
- **Profil membre** : une API sans content type (`src/api/member`) qui agrège utilisateurs, discussions, réponses et votes, sans jamais exposer l'e-mail.
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
│   ├── membres/[username]/           # Profil public d'un membre
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

- Profil enrichi : bio et avatar (extension du modèle User), édition par le membre lui-même.
- Invalidation du cache déclenchée par Strapi : webhook vers une route Next.js qui appelle `revalidateTag` quand un contenu est modifié depuis l'admin.
- Recherche plein texte PostgreSQL (`tsvector` + index GIN) à la place de `$containsi` quand le volume augmentera.
- Rate limiting des publications et modération (signalements, masquage).
- Compteur de réponses mis à jour par un `UPDATE ... SET replies_count = replies_count + 1` atomique, ou par un trigger, si la concurrence d'écriture devient forte.
- Pagination des réponses sur le détail (aujourd'hui toutes les réponses sont chargées).
- Inscription : l'endpoint natif `/api/auth/local/register` de Strapi reste ouvert (réglage par défaut, sans confirmation d'e-mail). À activer avec confirmation, ou à fermer, selon le besoin produit.
- Déconnexion : le cookie est supprimé, mais le JWT (sans état) reste valide jusqu'à expiration (7 jours). Une liste de révocation ou des jetons courts avec refresh token côté serveur règleraient ce point.
