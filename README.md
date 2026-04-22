# Scrute La Nature — Backend & Backoffice 🌿

Ce dépôt est le **monorepo Web** du projet *Scrute La Nature* développé pour la **LPO (Ligue pour la Protection des Oiseaux)**.  
Il contient l'API serveur NestJS et l'interface d'administration (Backoffice Next.js).

---

## 🏗️ Architecture du monorepo

```
lpo-balades-web/
├── apps/
│   ├── backend/         → API NestJS (REST + Swagger)
│   └── backoffice/      → Interface admin Next.js
└── package.json         → npm workspaces
```

### `apps/backend` — Serveur principal
- Framework : **NestJS** (TypeScript)
- ORM : **Prisma** + PostgreSQL (via Docker)
- Auth : **JWT** (Access 15 min + Refresh 6 mois) + **Redis** (blacklist tokens)
- Stockage fichiers : **Multer** (local, souverain, sans cloud GAFAM)
- Documentation API : **Swagger** → `http://localhost:3000/api/docs`

### `apps/backoffice` — Interface d'administration
- Framework : **Next.js** (TypeScript)
- UI : **shadcn/ui** + **Tailwind CSS**

---

## 🚀 Démarrage local

### Pré-requis
- Node.js ≥ 20 & npm
- Docker & Docker Compose

### Installation

```bash
# 1. Installer toutes les dépendances
npm install

# 2. Démarrer PostgreSQL + Redis via Docker
docker-compose up -d

# 3. Appliquer les migrations Prisma
cd apps/backend && npx prisma migrate dev

# 4. Créer le compte Super Admin initial
npx prisma db seed

# 5. Lancer l'environnement de développement (backend + backoffice)
cd ../.. && npm run dev
```

---

## 📦 Modules Backend implémentés

| Module | Routes | Statut |
|---|---|---|
| **Auth** | `POST /auth/register`, `/login`, `/guest`, `/logout`, `/refresh` | ✅ Sprint 1 |
| **Users** | `GET/PATCH/DELETE /users/me`, `GET/POST /admin/users` | ✅ Sprint 1 |
| **Agences** | `GET/POST/PATCH /admin/agences` | ✅ Sprint 1 |
| **Communes** | `GET/POST /admin/communes`, `GET /admin/stats/communes` | ✅ Sprint 1 |
| **Médias** | `POST /medias/upload`, `DELETE /medias/:filename` | ✅ Sprint 2 |
| **Parcours** | `GET/POST/PATCH/DELETE /admin/parcours` + filtres | ✅ Sprint 2 |
| **Étapes & Jeux** | `/admin/etapes`, `/admin/jeux` | 🔜 Sprint 3 |
| **Mobile** | `/mobile/parcours/download`, `/mobile/sync` | 🔜 Sprint 3 |
| **Social** | `/social/friends`, `/social/observations`, `/social/reviews` | 🔜 Sprint 4 |

---

## 🔒 Sécurité

- ✅ Authentification **JWT** (Access Token 15 min + Refresh Token 6 mois)
- ✅ **Blacklist Redis** : les tokens révoqués sont immédiatement invalides
- ✅ Mode **Invité** : accès immédiat sans email pour les joueurs du dimanche
- ✅ **RBAC** complet : `USER`, `EDITOR`, `ADMIN`, `SUPER_ADMIN`
- ✅ Vérification **email obligatoire** avant connexion
- ✅ Conformité **RGPD** : création de compte bloquée sans consentement explicite
- ✅ Protection **path traversal** sur la médiathèque
- ✅ Rate limiting (100 req / 15 min / IP)

---

## 🗄️ Base de données

Le schéma Prisma couvre l'ensemble du domaine LPO :

```
User → Session, VerificationToken, OAuthAccount
Agence → User[], Parcours[]
Commune → Parcours[]
Parcours → Etape[] → Jeu[]
User → UserBadge[], UserParcours[], Observation[], Review[], Friendship[]
```

> **Seed initial** : `npx prisma db seed`  
> Email : `superadmin@lpo.fr` | Mot de passe : `LpoAdmin123!` _(à changer en prod)_

---

## 🌿 Workflow Git

- `main` → code stable & validé
- `feat/sprint-X-*` → branches de fonctionnalités par sprint
