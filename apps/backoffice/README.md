# 💻 Scrute La Nature — Backoffice (Next.js)

> Interface d'administration pour la gestion des parcours de la **LPO Auvergne-Rhône-Alpes**.
> Permet aux éditeurs et administrateurs de créer, modifier, et suivre les performances des balades interactives.

---

## 🛠️ Stack Technique

- **Framework :** Next.js 14 (App Router)
- **Langage :** TypeScript
- **Style :** Tailwind CSS + `lucide-react` (icônes)
- **Composants :** Composants UI réutilisables basés sur une architecture propre (`src/components/ui`)
- **API Client :** Fétcheur personnalisé (`src/lib/api-client.ts`) avec gestion automatique des tokens JWT (Access & Refresh)
- **State & Auth :** Contexte React (`useAuth`) pour gérer la session et la persistance.

---

## 🚀 Installation & Lancement

Ce projet s'intègre au monorepo principal. Il est conseillé de tout lancer depuis la racine :

```bash
# Depuis la racine du projet (lpo-balades-web)
npm run dev
```

Cette commande démarre simultanément le Backend (port 3000) et le Backoffice (port 3001).
Vous pourrez y accéder via : [http://localhost:3001](http://localhost:3001)

### Variables d'environnement (`.env.local`)

```env
# URL de l'API Backend
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000/api"
```

---

## 🔐 Rôles et Accès (RBAC)

Le système gère un cloisonnement strict des données selon le niveau de l'utilisateur :

- **EDITOR (Animateur)** :
  - Peut créer, modifier et publier des parcours.
  - Ne voit et n'agit **que** sur les parcours liés à son organisme.
  - *L'onglet "Statistiques" et les paramètres globaux lui sont masqués.*

- **ADMIN (Responsable Régional)** :
  - Accès à toutes les fonctions de l'EDITOR.
  - Peut consulter les statistiques globales et détaillées de son organisme (KPIs, Tableau de Bord, Export CSV).
  - Gère les comptes collaborateurs de sa région.

- **SUPER_ADMIN (Siège LPO)** :
  - Vision globale sur le "Réseau National".
  - Peut créer de nouveaux organismes LPO et gérer tous les parcours/statistiques sans limite de région.

### Comptes de test par défaut

*(Créés automatiquement via `npx prisma db seed` côté Backend)* :
- `superadmin@lpo.fr` (Mdp: `LpoAdmin123!`)
- `admin@lpo.fr` (Mdp: `LpoAdmin123!`) - *Rattaché à LPO AURA*
- `editor@lpo.fr` (Mdp: `LpoAdmin123!`) - *Rattaché à LPO AURA*

---

## 📂 Architecture des Dossiers

```
apps/backoffice/
├── app/
│   ├── login/                → Page de connexion
│   ├── dashboard/            → Espace privé (protégé par AuthGuard)
│   │   ├── parcours/         → Liste et éditeur de parcours (CRUD)
│   │   ├── moderation/       → Interface de modération des avis (Reviews)
│   │   ├── equipe/           → Gestion des collaborateurs (Admin/Editor)
│   │   ├── statistiques/     → Dashboard Data (KPIs, Export CSV)
│   │   ├── zonages/          → Gestion du référentiel géographique
│   │   ├── organismes/       → Réservé SUPER_ADMIN (Réseau National)
│   │   └── layout.tsx        → Layout avec Sidebar latérale
│   └── globals.css           → Styles globaux Tailwind
├── src/
│   ├── components/           → Composants d'UI réutilisables (Badge, Select, etc.)
│   ├── hooks/                → Custom hooks (useAuth, useRoles)
│   ├── lib/                  → Utilitaires (api-client, gestion du token)
│   ├── services/             → Appels API typés par entité
│   └── types/                → Types TypeScript globaux (alignés avec le Backend)
```

---

## 🏗️ Fonctionnalités Principales

- **Authentification Sécurisée :** JWT avec rotation automatique via `api-client`.
- **Gestion des Parcours :** Interface permettant l'ajout dynamique d'étapes (GPS) et l'intégration de multiples types de jeux (QCM, Charades, Info, etc.). La narration (mascotte, indications) est désormais intégralement gérée via les mini-jeux. Activation du mode Escape Game (chronométré) disponible.
- **Modération & Gestion (Paginée) :** Listes paginées avec barre de recherche côté serveur pour les Utilisateurs, les Zonages et les Avis (Modération).
- **Dashboard Data :** Suivi en temps réel de la progression du projet avec génération de tableaux croisés et de fichiers CSV téléchargeables.
- **Mode Sombre (À venir) :** Préparation du support des thèmes via les tokens CSS.
