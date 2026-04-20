# Scrute La Nature - Backend & Backoffice 🌿

Ce dépôt contient le monorepo web du projet "Scrute La Nature" pour la LPO (Ligue pour la Protection des Oiseaux).
Il inclut l'API serveur robuste et l'interface d'administration (Backoffice).

## 🏗️ Architecture

- **`apps/backend`** : Serveur principal développé en **NestJS**. Il utilise **Prisma** avec **PostgreSQL** pour la gestion de la base de données. Il contient la logique métier, la gestion du jeu hors ligne (téléchargement et synchronisation), l'authentification avancée (JWT, Invité), et la médiathèque.
- **`apps/backoffice`** : Interface d'administration pour les équipes de la LPO, développée en **Next.js** avec **shadcn/ui** et **Tailwind CSS**. Elle permet de configurer les balades, les étapes GPS, et les mini-jeux.

## 🚀 Démarrage

### Pré-requis
- Node.js & npm
- Docker et Docker Compose

### Lancement Local
1. `npm install` à la racine pour installer toutes les dépendances des workspaces.
2. Démarrer la base de données locale (PostgreSQL et Redis) via `docker-compose up -d`.
3. Pousser le schéma Prisma : `cd apps/backend && npx prisma migrate dev`.
4. Lancer les projets en développement : `npm run dev` à la racine.

## 🔒 Sécurité
- Authentification JWT avec Refresh Token
- Liste noire de tokens via Redis
- Modes Invités sécurisés pour les joueurs côté Mobile
- Rôles et contrôles d'accès (RBAC) pour les collaborateurs LPO
