<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS" />
</p>

# 🌿 Scrute La Nature — API Backend (NestJS)

> API REST du projet *Scrute La Nature* pour la **LPO Auvergne-Rhône-Alpes**.  
> Gère l'authentification, le contenu des parcours, la synchronisation mobile hors-ligne et les fonctionnalités sociales.

---

## 📚 Documentation interactive

Une fois le serveur démarré, la documentation Swagger complète est disponible :

```
http://localhost:3000/api/docs
```

Tous les endpoints y sont documentés avec leurs corps de requête, réponses, codes d'erreur et le Bearer Token nécessaire.

---

## 🛠️ Installation & Lancement

> ℹ️ Ce projet fait partie d'un monorepo npm workspaces. Lancer depuis la racine `lpo-balades-web/` est recommandé.

```bash
# Depuis la racine du monorepo
npm install
docker-compose up -d        # Lance PostgreSQL sur le port 5434

# Migrations & seed
cd apps/backend
npx prisma migrate deploy
npx prisma migrate dev
npx prisma db seed          # Crée les comptes superadmin, admin et editor rattachés à LPO AURA

# Lancement (depuis la racine)
cd ../..
npm run dev                 # Backend port 3000 + Backoffice port 3001
```

### Variables d'environnement (`.env` dans `apps/backend/`)

```env
# Base de données
DATABASE_URL="postgresql://lpo_user:lpo_password@localhost:5434/lpo_db"

# JWT
JWT_SECRET="change-me-in-production"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="change-me-too"
JWT_REFRESH_EXPIRATION="180d"

# Serveur mail (Mailtrap en dev)
MAIL_HOST="sandbox.smtp.mailtrap.io"
MAIL_PORT=587
MAIL_USER="<votre_user_mailtrap>"
MAIL_PASSWORD="<votre_mdp_mailtrap>"
MAIL_FROM="noreply@scrutelanature.fr"

# Application
APP_URL="http://localhost:3000"
APP_NAME="Scrute La Nature"
PORT=3000
```

---

## 🏗️ Architecture des modules

```
src/
├── modules/
│   ├── auth/           → Auth JWT, 2FA, OAuth Google, register, login, refresh
│   ├── users/          → Profil utilisateur, gestion admin, suppression RGPD
│   ├── organismes/     → Structures LPO régionales
│   ├── zonages/        → Référentiel géographique + stats investisseurs
│   ├── parcours/       → CRUD parcours avec cloisonnement par organisme
│   ├── etapes/         → Points d'arrêt GPS des parcours
│   ├── jeux/           → Mécaniques ludiques attachées aux étapes
│   ├── medias/         → Upload/delete de fichiers (images, audio, GPX)
│   ├── mobile/         → Endpoints dédiés à l'app mobile (search, nearby, download, sync)
│   └── social/         → Système d'amis + avis/notes sur les parcours
├── common/
│   ├── guards/         → JwtAuthGuard, RolesGuard
│   └── decorators/     → @Public(), @Roles()
├── config/             → AppConfigService (variables d'env typées)
├── database/           → DatabaseService (Prisma client singleton)
└── providers/
    └── mail/           → MailService + templates EJS
```

---

## 📡 Référence des endpoints

### 🔐 Auth — `/api/auth`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Création de compte (RGPD requis) |
| `POST` | `/auth/login` | Public | Connexion → `access_token` + `refresh_token` |
| `POST` | `/auth/guest` | Public | Connexion anonyme (joueur invité) |
| `POST` | `/auth/logout` | JWT | Invalide la session courante |
| `POST` | `/auth/refresh` | JWT Refresh | Renouvelle les tokens |
| `GET` | `/auth/profile` | JWT | Renvoie le profil du token courant |
| `GET` | `/auth/verify-email` | Public | Vérifie l'email via token |
| `POST` | `/auth/forgot-password` | Public | Envoie un email de reset |
| `POST` | `/auth/reset-password` | Public | Réinitialise le mot de passe |

### 👤 Utilisateurs — `/api/users`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/users/me` | JWT | Profil de l'utilisateur connecté |
| `PATCH` | `/users/me` | JWT | Mise à jour (prénom, pseudo, pushToken, analyticsConsent) |
| `DELETE` | `/users/me` | JWT | Suppression RGPD complète (cascade) |
| `GET` | `/admin/users` | ADMIN | Liste tous les employés |
| `POST` | `/admin/users` | ADMIN | Crée un compte employé (EDITOR/ADMIN) |

### 🏢 Organismes — `/api/admin/organismes`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/organismes` | ADMIN | Liste les organismes LPO |
| `GET` | `/admin/organismes/:id` | ADMIN | Détail + liste des employés |
| `POST` | `/admin/organismes` | SUPER_ADMIN | Créer un organisme |
| `PATCH` | `/admin/organismes/:id` | SUPER_ADMIN | Mettre à jour |

### 🗺️ Zonages & Statistiques — `/api/admin/zonages` & `/api/admin/stats`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/zonages` | EDITOR/ADMIN | Référentiel des zonages avec pagination et recherche texte |
| `POST` | `/admin/zonages` | ADMIN | Ajouter une zonage |
| `GET` | `/admin/stats/zonages` | ADMIN | Stats investisseurs : joueurs uniques, completions, note moyenne |
| `GET` | `/admin/stats` | ADMIN | Dashboard global (KPIs, Tableau croisé des organismes) |
| `GET` | `/admin/stats/export/csv` | ADMIN | Export complet des statistiques en fichier CSV |

### 🖼️ Médias — `/api/medias`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/medias/upload` | JWT | Upload fichier (image/audio/gpx) — retourne l'URL publique |
| `DELETE` | `/medias/:filename` | ADMIN | Supprime un fichier du disque |

### 🏕️ Parcours — `/api/admin/parcours`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/parcours` | ADMIN | Liste paginée (cloison par organisme) — filtres : statut, difficulté, zonage |
| `GET` | `/admin/parcours/:id` | ADMIN | Détail complet avec étapes & jeux |
| `POST` | `/admin/parcours` | EDITOR | Créer un parcours |
| `PATCH` | `/admin/parcours/:id` | EDITOR | Mettre à jour |
| `DELETE` | `/admin/parcours/:id` | ADMIN | Supprimer (cascade étapes & jeux) |

### 🚩 Étapes — `/api/admin/etapes`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/etapes` | EDITOR | Créer une étape GPS |
| `GET` | `/admin/etapes/parcours/:parcoursId` | EDITOR | Lister les étapes d'un parcours |
| `GET` | `/admin/etapes/:id` | EDITOR | Détail d'une étape |
| `PATCH` | `/admin/etapes/:id` | EDITOR | Mettre à jour |
| `DELETE` | `/admin/etapes/:id` | EDITOR | Supprimer |

### 🎮 Jeux — `/api/admin/jeux`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/jeux` | EDITOR | Créer un jeu (QCM, texte, photo…) |
| `GET` | `/admin/jeux/etape/:etapeId` | EDITOR | Lister les jeux d'une étape |
| `GET` | `/admin/jeux/:id` | EDITOR | Détail d'un jeu |
| `PATCH` | `/admin/jeux/:id` | EDITOR | Mettre à jour |
| `DELETE` | `/admin/jeux/:id` | EDITOR | Supprimer |

### 📱 Mobile — `/api/mobile`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/mobile/parcours/search` | JWT | Recherche par zonage + filtres d'accessibilité (PMR, enfants…) |
| `GET` | `/mobile/parcours/nearby` | JWT | Parcours dans un rayon GPS (Haversine, défaut 50 km) |
| `GET` | `/mobile/parcours/:id/download` | JWT | Export complet (étapes + jeux) pour le mode offline SQLite |
| `POST` | `/mobile/sync` | JWT | **Synchronisation hors-ligne idempotente** — envoie les parcours complétés offline |

#### Format de réponse `POST /mobile/sync`

```json
{
  "success": true,
  "message": "Synchronisation complète.",
  "results": {
    "parcoursCompleted": { "synced": 1, "skipped": 0 },
    "errors": []
  }
}
```

> **Idempotence** : chaque événement est identifié par un `syncId` (UUID v4) généré côté mobile. Un `syncId` déjà connu est ignoré silencieusement → pas de double-comptage de points même en cas de micro-coupure réseau.

### 🤝 Social — Amis — `/api/social/friends`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/social/friends/request` | JWT | Envoyer une demande d'ami **par pseudo** |
| `GET` | `/social/friends/requests` | JWT | Voir les demandes reçues (PENDING) |
| `GET` | `/social/friends` | JWT | Voir sa liste d'amis (ACCEPTED) |
| `PATCH` | `/social/friends/:id/accept` | JWT | Accepter une demande (destinataire uniquement) |
| `PATCH` | `/social/friends/:id/block` | JWT | Bloquer un utilisateur |
| `DELETE` | `/social/friends/:id` | JWT | Supprimer un ami / refuser / annuler |

### ⭐ Social — Avis — `/api/social/reviews`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/social/reviews` | JWT | Laisser un avis (1 à 5 ⭐, commentaire optionnel) — 1 seul par parcours |
| `GET` | `/social/reviews/parcours/:id` | JWT | Avis d'un parcours (paginés) + note moyenne calculée |
| `GET` | `/social/reviews/admin/all` | ADMIN | Liste paginée de tous les avis pour modération avec recherche |
| `DELETE` | `/social/reviews/:id` | JWT | Supprimer (auteur ou ADMIN — modération) |

---

## 🔒 Sécurité

| Mesure | Implémentation |
|---|---|
| **JWT Dynamique** | Access Token 15 min + Refresh Token 6 mois. Validation par vérification BDD (injection de `organismeId` à jour). |
| **RBAC** | `USER` · `EDITOR` · `ADMIN` · `SUPER_ADMIN` via `@Roles()` + `RolesGuard` |
| **Cloisonnement organisme** | Chaque ADMIN/EDITOR ne voit et n'agit que sur les données de son propre organisme (Parcours, Stats) |
| **Escalade de rôle bloquée** | `PATCH /users/me` utilise `UpdateMeDto` (pas de champ `role` ni `organismeId`) |
| **RGPD** | Inscription bloquée sans consentement · Suppression de compte avec cascade totale |
| **Validation stricte** | `@IsUUID()` `@IsISO8601()` `@Min/@Max` `@ArrayMaxSize()` sur tous les DTOs |
| **Path traversal** | Protection sur `MediasService.deleteFile()` |
| **Rate limiting** | 100 req / 15 min / IP |

---

## 🧪 Tests API

Un script de test end-to-end est inclus dans `apps/backend/test-api.js`.  
Il couvre 21 scénarios sur un serveur en cours d'exécution :

```bash
# Lancer le serveur en arrière-plan, puis :
node apps/backend/test-api.js
```

**Couverture :**
- Login → création organisme/zonage/parcours/étape/jeu
- Download offline + recherche géographique Nearby
- Sync hors-ligne + idempotence (même syncId → skippé)
- Sécurité : escalade de rôle, date ISO invalide, UUID invalide
- Système d'amis (pseudo inconnu → 404)
- Avis : création, doublon rejeté (409), note moyenne, suppression
- Stats investisseurs : structure et données vérifiées

---

## 🗄️ Base de données

Schéma Prisma dans `prisma/schema.prisma`.

```
User → Session[], VerificationToken[], OAuthAccount[]
User → UserBadge[], UserParcours[], Observation[]*, Review[], Friendship[]
Organisme → User[] (employes), Parcours[]
Zonage → Parcours[]
Parcours → Etape[] → Jeu[]
Parcours → Review[], UserParcours[]
```

> \* `Observation` : table conservée en DB, routes non activées (budget stockage cloud en attente).

### Commandes utiles

```bash
# Créer une migration après modification du schéma
npx prisma migrate dev --name ma_migration

# Réinitialiser la DB + reseed (dev uniquement)
npx prisma migrate reset --force && npx prisma db seed

# Ouvrir Prisma Studio (GUI base de données)
npx prisma studio
```

---

## 🌿 Workflow Git

| Branche | Usage |
|---|---|
| `main` | Code stable validé par Fred (PR obligatoire) |
| `feat/sprint-X-*` | Feature branches par sprint |

Sprint actuel : **`feat/sprint-4-social-sync`** — Sprint 4 terminé ✅  
Prochain : `feat/sprint-5-backoffice`
