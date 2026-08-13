# Scrute La Nature — Monorepo Web 🌿

> **Dépôt Web du projet *Scrute La Nature*** — développé pour la **LPO Auvergne-Rhône-Alpes**.  
> Ce monorepo contient l'API serveur NestJS et l'interface d'administration Backoffice (Next.js).

---

## 🏗️ Architecture du monorepo

```text
lpo-balades-web/
├── apps/
│   ├── backend/               → API REST NestJS (TypeScript) — port 3000
│   │   ├── prisma/            → Schéma de base de données, Migrations, Seeders
│   │   └── src/               → Code source du serveur API
│   │       ├── common/        → Filtres globaux (erreurs Prisma), Guards, Décorateurs
│   │       ├── database/      → Service d'instanciation Prisma Client
│   │       ├── modules/       → Logique métier (Auth, Users, Parcours, Notifications...)
│   │       └── providers/     → Services tiers (Mailing, Expo Push)
│   │
│   └── backoffice/            → Interface admin Next.js (App Router) — port 3001
│       ├── app/               → Pages de l'application (Routing Next.js)
│       │   ├── (auth)/        → Écrans de connexion / mot de passe oublié
│       │   └── dashboard/     → Interface interne cloisonnée (Zonages, Statistiques...)
│       ├── components/        → Composants UI globaux (shadcn/ui, navbar, sidebar)
│       └── src/               
│           └── lib/           → Utilitaires, définition du client API (apiClient)
│
└── package.json               → npm workspaces (racine)
```

### `apps/backend` — API principale
| Technologie | Usage |
|---|---|
| **NestJS** (TypeScript) | Framework principal |
| **Prisma 7** + PostgreSQL | ORM + base de données relationnelle |
| **JWT** | Auth stateless (Access 15 min + Refresh 6 mois) |
| **Multer** | Stockage de médias local (sans cloud GAFAM) |
| **Swagger** | Documentation API → `http://localhost:3000/api/docs` |

### `apps/backoffice` — Interface d'administration
| Technologie | Usage |
|---|---|
| **Next.js** (TypeScript) | Framework React SSR |
| **shadcn/ui** + Tailwind CSS | Composants UI |

---

## 🚀 Démarrage local

### Pré-requis
- Node.js ≥ 20 & npm
- Docker & Docker Compose

### Installation complète

```bash
# 1. Installer toutes les dépendances (monorepo)
npm install

# 2. Démarrer PostgreSQL via Docker
docker-compose up -d

# 3. Appliquer les migrations Prisma et créer le compte Super Admin
cd apps/backend
npx prisma migrate dev
npx prisma db seed

# 4. Lancer backend + backoffice en parallèle
cd ../..
npm run dev
```

### URLs locales
| Service | URL |
|---|---|
| API Backend | `http://localhost:3000/api` |
| Documentation Swagger | `http://localhost:3000/api/docs` |
| Backoffice Admin | `http://localhost:3001` |

### Comptes par défaut (seed)
```
[SUPER ADMIN]
Email    : superadmin@lpo.fr
Password : LpoAdmin123!

[ADMIN RÉGIONAL]
Email    : admin@lpo.fr
Password : LpoAdmin123!

[ANIMATEUR / ÉDITEUR]
Email    : editor@lpo.fr
Password : LpoEditor123!
```
> ⚠️ Changer ce mot de passe avant tout déploiement en production.

---

## 📦 Modules Backend — État d'avancement

### ✅ Sprint 1 — Socle Auth & Utilisateurs
| Module | Routes principales |
|---|---|
| **Auth** | `POST /auth/register` `/login` `/guest` `/logout` `/refresh` `/forgot-password` `/reset-password` |
| **Users** | `GET/PATCH/DELETE /users/me` · `GET/POST /admin/users` |
| **Email** | Vérification d'email · Réinitialisation mot de passe (templates EJS) |
| **2FA** | TOTP (Google Authenticator) via `otplib` |
| **OAuth** | Google OAuth 2.0 (Passport) |

### ✅ Sprint 2 — Référentiels & Médias
| Module | Routes principales |
|---|---|
| **Organismes** | `GET/POST/PATCH /admin/organismes` |
| **Zonages** | `GET/POST /admin/zonages` · `GET /admin/stats/zonages` |
| **Médias** | `POST /medias/upload` · `DELETE /medias/:filename` |
| **Parcours** | `GET/POST/PATCH/DELETE /admin/parcours` (filtres : statut, difficulté, zonage) |
| **Mobile — Search** | `GET /mobile/parcours/search` (zonage + accessibilité PMR/enfants) |
| **Mobile — Nearby** | `GET /mobile/parcours/nearby` (Haversine, rayon configurable) |

### ✅ Sprint 3 — Contenu, Mode Hors-Ligne & Escape Game
| Module | Routes principales |
|---|---|
| **Étapes** | `GET/POST/PATCH/DELETE /admin/etapes` (cloisonné par organisme) |
| **Jeux** | `GET/POST/PATCH/DELETE /admin/jeux` (types : QCM, texte, photo…) |
| **Parcours** | Mode Escape Game : Ajout des attributs chronométrés sur les parcours (`isEscapeGame`, `timeLimitMinutes`) |
| **Mobile — Download** | `GET /mobile/parcours/:id/download` (payload complet pour SQLite offline) |

### ✅ Sprint 4 — Social, Synchronisation & Statistiques
| Module | Routes principales |
|---|---|
| **Mobile — Sync** | `POST /mobile/sync` (idempotent via `syncId` UUID) |
| **Amis** | `POST /social/friends/request` · `GET /social/friends` · `GET /social/friends/requests` · `PATCH /:id/accept` · `PATCH /:id/block` · `DELETE /:id` |
| **Avis** | `POST /social/reviews` · `GET /social/reviews/parcours/:id` · `DELETE /social/reviews/:id` |
| **Stats investisseurs** | `GET /admin/stats/zonages` (tableau croisé : joueurs uniques, completions, note moyenne) |
| **Backoffice (Pagination & Recherche)** | Listes paginées côté serveur (Utilisateurs, Zonages, Avis) avec barre de recherche |
| **Refonte Narration** | Simplification des modèles `Parcours`/`Etape` : la mascotte et la narration utilisent désormais exclusivement les mini-jeux (`JeuType.INFO`) |

> **Note — Galerie d'observations :** La synchronisation des photos terrain (`observations[]`) est volontairement désactivée en attente de confirmation. Le modèle Prisma `Observation` est conservé en base. Réactivation : 2 étapes documentées dans le code.

---

## 🔒 Sécurité

| Mesure | Détail |
|---|---|
| **JWT double token** | Access Token (15 min) + Refresh Token (6 mois, haché bcrypt en base) |
| **Révocation de session** | Sessions supprimées en DB au logout |
| **Cloisonnement organisme** | Un ADMIN/EDITOR ne voit et ne modifie que les données de son organisme |
| **RBAC** | `USER` · `EDITOR` · `ADMIN` · `SUPER_ADMIN` via `@Roles()` + `RolesGuard` |
| **Vérification email** | Connexion impossible sans email vérifié (sauf compte invité) |
| **Conformité RGPD** | Inscription bloquée sans `rgpdAccepted: true` · Suppression de compte avec cascade complète |
| **Escalade de rôle bloquée** | `PATCH /users/me` accepte uniquement les champs personnels (pas `role`, pas `organismeId`) |
| **Path traversal** | Protection sur le service de médias (upload / delete) |
| **Rate limiting** | 100 requêtes / 15 min / IP (Helmet + express-rate-limit) |
| **Validation stricte** | `class-validator` sur tous les DTOs : UUID, ISO8601, ranges numériques, tailles de tableau |

---

## 🗄️ Schéma base de données

```
User → Session[], VerificationToken[], OAuthAccount[]
User → UserBadge[], UserParcours[], Observation[], Review[], Friendship[]
Organisme → User[] (employes), Parcours[]
Zonage → Parcours[]
Parcours → Etape[] → Jeu[]
Parcours → Review[], UserParcours[]
```

---

## 🔔 Notifications Push (Expo)

Le système de notifications push utilise **Expo Server SDK**.

### Architecture d'envoi
1. L'application mobile demande un token d'appareil (Ex: `ExponentPushToken[...]`) et l'envoie au Backend via `PATCH /users/me`.
2. Le token est stocké dans le champ `pushToken` de l'entité `User`.
3. Le **Backoffice** appelle `POST /admin/notifications/send-all`.
4. Le service **NotificationsService** du Backend récupère tous les utilisateurs ayant un `pushToken`, vérifie leur validité, divise les envois en lots (chunks) et contacte l'API d'Expo.
5. Expo transmet à **Firebase Cloud Messaging (FCM)** pour Android, ou **APNs** pour iOS.

### ⚠️ Piège classique lors des tests (0 utilisateurs trouvés)
Si le Backoffice affiche l'erreur : *"Aucun utilisateur ayant enregistré un token de notification n'existe en base de données"*, cela est généralement dû à une différence d'environnements :
- L'APK installé sur le téléphone de test est configuré pour pointer vers l'API de **Production** (`https://api...`). Le téléphone s'enregistre donc sur la base de données de production.
- Vous lancez le Backoffice et le Backend en **Local** (`http://localhost:3000`). La base de données locale n'a reçu aucun token.
👉 **Solution :** Testez l'envoi depuis le backoffice de production, OU modifiez le `.env` de l'app mobile pour pointer vers votre IP locale et re-compilez un Dev Client (`npx expo run:android`).

---

## 📈 Guide de Montée en Version (Upgrades)

Maintenir le monorepo à jour implique de gérer Prisma, NestJS, et Next.js de manière cohérente :

### 1. Mise à jour de Prisma (Base de données)
Lorsqu'une nouvelle version de Prisma sort, il est impératif de mettre à jour le CLI **et** le Client simultanément dans le workspace `backend` :
```bash
cd apps/backend
npm install prisma@latest @prisma/client@latest
npx prisma generate
```

### 2. Mises à jour Node.js / NPM Packages
Pour mettre à jour les packages de sécurité ou frameworks majeurs :
```bash
# Vérifier les paquets obsolètes à la racine et dans les workspaces
npm outdated -ws

# Mettre à jour un paquet spécifique dans le backoffice (ex: Next.js)
npm install next@latest -w backoffice

# Mettre à jour le backend (ex: NestJS)
npm install @nestjs/core@latest @nestjs/common@latest -w backend
```
*Note : Privilégiez des mises à jour testées individuellement plutôt qu'un `npm update` global qui pourrait casser les dépendances croisées.*

---

## 🆕 Dernières Évolutions (Changelog Récent)

Pour faciliter la reprise du projet par d'autres développeurs, voici les derniers correctifs et choix d'architecture mis en place :

### 1. Correctifs de l'espace de travail (NPM Workspaces)
- **Erreur de script racine** : Le script `npm run dev` à la racine plantait à cause du paquet `concurrently` introuvable. Ce paquet a été installé à la racine du monorepo pour permettre le lancement simultané du `backend` (port 3000) et du `backoffice` (port 3001) avec une seule commande.

### 2. Backoffice : Appels API et SSR (Next.js App Router)
- **Problème résolu** : Les requêtes depuis les Server Components (comme la page `notifications/page.tsx`) vers le backend retournaient des erreurs `404 Not Found` lorsqu'elles utilisaient des chemins relatifs (`/api/...`).
- **Solution d'architecture** : Toutes les communications Server-to-Server doivent désormais utiliser l'utilitaire `apiClient` situé dans `apps/backoffice/src/lib/api-client.ts`. Cet utilitaire construit automatiquement l'URL absolue (`http://localhost:3000/api/...` ou prod) et transmet de façon transparente le token d'authentification récupéré via `cookies()`.

### 3. Backoffice : Interface de Notifications Push
- Ajout d'une interface d'administration permettant l'envoi manuel de notifications Push à tous les utilisateurs.
- Le backend lit correctement les erreurs renvoyées par Expo (ex: logs détaillés sur les tokens non enregistrés) et les transmet au front-end pour afficher un diagnostic précis en cas d'échec de la campagne.

---

## 🌿 Workflow Git

| Branche | Usage |
|---|---|
| `main` | Code stable et validé (recette Fred) |
| `feat/sprint-X-*` | Développement par sprint |

```bash
# Exemple de workflow
git checkout -b feat/sprint-5-backoffice
# ... développement ...
git push origin feat/sprint-5-backoffice
# → Pull Request → Review Fred → Merge main
```

