# Scrute La Nature — Monorepo Web 🌿

> **Dépôt Web du projet *Scrute La Nature*** — développé pour la **LPO Auvergne-Rhône-Alpes**.  
> Ce monorepo contient l'API serveur NestJS et l'interface d'administration Backoffice (Next.js).

---

## 🏗️ Architecture du monorepo

```
lpo-balades-web/
├── apps/
│   ├── backend/         → API REST NestJS (TypeScript) — port 3000
│   └── backoffice/      → Interface admin Next.js — port 3001
└── package.json         → npm workspaces (racine)
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

### ✅ Sprint 3 — Contenu & Mode Hors-Ligne
| Module | Routes principales |
|---|---|
| **Étapes** | `GET/POST/PATCH/DELETE /admin/etapes` (cloisonné par organisme) |
| **Jeux** | `GET/POST/PATCH/DELETE /admin/jeux` (types : QCM, texte, photo…) |
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
