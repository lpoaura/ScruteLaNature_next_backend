# Architecture GLOBALE

# 1. Architecture du Backend (NestJS)

Le backend est le cœur du système. Il expose l'API REST utilisée par le backoffice et l'application mobile, et gère la base de données PostgreSQL via Prisma. Il est structuré de manière modulaire selon les standards de **NestJS**.

## Fichiers principaux à la racine
- **`package.json`** : Contient les scripts et dépendances du projet (NestJS, Prisma, etc.).
- **`prisma/schema.prisma`** : Le schéma de la base de données. C'est ici que sont définies toutes les tables (User, Parcours, Etape, Jeu, etc.) et leurs relations.
- **`.env`** : Fichier (non versionné) contenant les variables d'environnement (URL de la base de données, secrets JWT, clés AWS/SMTP).
- **`Dockerfile` & `entrypoint.sh`** : Configuration pour conteneuriser l'application avec Docker.

## Structure du dossier `src/`

Le dossier `src/` est divisé en plusieurs grandes catégories :

### 1. `src/modules/`
C'est ici que se trouve la logique métier de l'application. Chaque dossier représente une fonctionnalité (ou un domaine) et contient typiquement un contrôleur (`.controller.ts`), un service (`.service.ts`), des DTOs (Data Transfer Objects), et parfois un module NestJS (`.module.ts`).

- **`auth/`** : Gère l'authentification (connexion, inscription, JWT, mode invité, 2FA).
- **`users/`** : Gère les profils utilisateurs et leurs rôles.
- **`parcours/` & `etapes/` & `jeux/`** : Le cœur de l'application. Gère la création, la récupération et la modification des parcours de balades, des étapes géolocalisées qui les composent, et des mini-jeux associés à chaque étape.
- **`medias/`** : Gère l'upload et le stockage des fichiers (images, audios) liés aux parcours.
- **`organismes/` & `zonages/`** : Gère les entités partenaires (LPO) et les zones géographiques auxquelles les parcours sont rattachés.
- **`anecdotes/`** : Gère le système "Le saviez-vous ?" affiché sur l'application mobile.
- **`social/`** : Gère les fonctionnalités communautaires (amis, commentaires, notes).
- **`stats/` & `history/`** : Calcule les statistiques d'utilisation (nombre de joueurs, distances) et l'historique des parties.
- **`downloads/` & `mobile/`** : Endpoints spécifiques optimisés pour l'application mobile (synchronisation hors-ligne, récupération globale).
- **`notifications/`** : Gère l'envoi de notifications push (Firebase FCM).

### 2. `src/common/`
Contient tous les éléments réutilisables transversaux du backend.
- **`decorators/`** : Décorateurs personnalisés (ex: `@Roles()`, `@CurrentUser()`).
- **`guards/`** : Vérifie les autorisations avant d'exécuter une requête (ex: vérification du token JWT, vérification des rôles d'administration).
- **`interceptors/`** : Intercepte les requêtes/réponses pour formater les données.
- **`filters/` & `middleware/`** : Gestion des erreurs globales et traitement intermédiaire.

### 3. `src/providers/`
Services externes ou utilitaires isolés.
- **`mail/`** : Configuration et envoi des emails (réinitialisation de mot de passe, etc.).
- **`storage/`** : Gestion du stockage de fichiers local ou sur S3.

### 4. `src/database/`
- Dossier contenant la configuration du service Prisma (`prisma.service.ts`) permettant aux autres modules d'interagir avec la base de données.

## Fonctionnement général
Lorsqu'une requête arrive (ex: `GET /parcours`), elle est sécurisée par un Guard (`common/guards/`), traitée par le contrôleur approprié (`modules/parcours/parcours.controller.ts`), qui délègue la logique au service (`parcours.service.ts`). Ce service interroge la base de données via Prisma (`database/prisma.service.ts`) et retourne le résultat.

---

# Architecture du Backoffice (Next.js)

Le backoffice est l'interface d'administration web destinée aux membres de la LPO (Éditeurs, Administrateurs, Super-Admins). Il permet de créer les parcours, modérer le contenu, et consulter les statistiques. Il est développé avec **Next.js** (App Router) et **Tailwind CSS**.

## Fichiers principaux à la racine
- **`package.json`** : Dépendances frontend (React, Next, Tailwind, Lucide Icons, etc.).
- **`tailwind.config.ts` / `postcss.config.mjs`** : Configuration du moteur de style Tailwind CSS.
- **`next.config.ts`** : Configuration de Next.js (optimisation d'images, proxy éventuel).
- **`proxy.ts`** : Souvent utilisé pour rediriger les requêtes API en mode développement vers le backend afin d'éviter les problèmes de CORS.

## Structure du dossier `app/` (Le Routing)

Next.js utilise le "App Router" où chaque dossier correspond à une route de l'URL.

- **`app/(auth)/`** : Le groupe d'authentification. Contient les pages de connexion (`login/`), d'oubli de mot de passe (`forgot-password/`), etc. Le `(auth)` entre parenthèses permet de grouper ces routes sans affecter l'URL (ex: `/login`).
- **`app/dashboard/`** : Le cœur du backoffice, protégé par authentification.
  - **`layout.tsx`** : Le gabarit principal du backoffice. Il contient la barre de navigation latérale (Sidebar) et l'entête (Header) communes à toutes les pages du dashboard.
  - **`page.tsx`** : La page d'accueil du dashboard (Statistiques globales rapides).
  - **`parcours/`** : Interface de création et d'édition des balades (avec la fameuse carte et le gestionnaire d'étapes).
  - **`statistiques/`** : Page détaillée des tableaux de bords analytiques.
  - **`organismes/` & `zonages/`** : Gestion des partenaires et des territoires (Super-Admin uniquement).
  - **`equipe/`** : Gestion des membres du staff et de leurs droits.
  - **`medias/`** : Bibliothèque des images et sons uploadés.
  - **`anecdotes/`** : Gestion du contenu "Le saviez-vous ?".
  - **`notifications/`** : Envoi de messages push aux joueurs.
  - **`moderation/`** : Validation ou suppression des commentaires laissés par les joueurs.

## Structure du dossier `src/` (La Logique et l'UI)

Ce dossier regroupe tous les éléments partagés qui ne sont pas des pages web à part entière.

- **`src/components/ui/`** : Composants visuels génériques et réutilisables (Boutons, Modales, Inputs, Éditeur Markdown). Ils sont souvent inspirés de bibliothèques comme `shadcn/ui`.
- **`src/components/layout/`** : Composants de structure (Sidebar, Header, Layouts spécifiques).
- **`src/components/parcours/`** : Composants très spécifiques à la création des balades. C'est ici qu'on trouve `ParcoursMapEditor.tsx` (l'éditeur de carte) et `JeuxManager.tsx` (la création de mini-jeux).
- **`src/components/auth/`** : Formulaires de connexion et de vérification.
- **`src/services/`** : Fichiers responsables de faire les requêtes HTTP vers le Backend (`apiClient.ts`, `parcours.service.ts`, `stats.service.ts`, etc.).
- **`src/hooks/`** : Hooks React personnalisés (ex: `useAuth` pour gérer la session utilisateur).
- **`src/types/`** : Définitions TypeScript partagées (souvent alignées sur les modèles du Backend) pour garantir la sécurité du typage.
- **`src/lib/`** : Fonctions utilitaires diverses (formatage de dates, de texte, etc.).
