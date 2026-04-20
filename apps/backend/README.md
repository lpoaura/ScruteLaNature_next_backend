<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# 🚀 Ultimate NestJS Auth Boilerplate

Ce projet est un "Boilerplate" robuste et sécurisé construit sur **NestJS**, prêt à l'emploi. Il intègre toutes les meilleures pratiques modernes concernant l'authentification, la gestion des sessions, la sécurité et les autorisations.

Oubliez les configurations répétitives, tout ce dont vous avez besoin pour démarrer une plateforme solide est déjà là.

## 🎯 Fonctionnalités Incluses (Étapes 1 à 6 terminées)

### 1. Base Project & Base de données 🐘
* Initialisation NestJS avec Typescript strict.
* **PostgreSQL** + **Prisma ORM** : Modélisation des tables `User`, `Session`, et `VerificationToken` prête à scaler.
* Variables d'environnement configurées via `@nestjs/config`.

### 2. Documentation Automatique 📚
* Intégration de **Swagger UI** (accessible sur `/api/docs`).
* Documentation complète de chaque Endpoint (Responses, Body, Bearer Token) avec `@nestjs/swagger`.

### 3. Première Couche de Sécurité Globale 🛡️
* **Helmet** pour la protection avancée des Headers HTTP.
* **Express-Rate-Limit** pour limiter le nombre de requêtes et contrer le _Brute Force_.
* Validation stricte des données entrantes (`class-validator` & `class-transformer` sur DTOs).
* Hachage puissant des mots de passe grâce à **Bcrypt** (Salt: 12).

### 4. Authentification (JWT & Refresh Tokens avec Redis) 🔑
* Architecture Login / Logout / Refresh Token.
* **Access Tokens** de courte durée pour l'accès aux API sécurisées.
* **Refresh Tokens** persistés dans la BDD (hashés) pour le renouvellement.
* Invalidations intelligentes à la déconnexion : Le Refresh Token est détruit en base, et **Redis** agit en barrière instantanée pour ajouter l'Access Token (encore valide mais dont l'utilisateur ne veut plus) dans une **Blacklist** !

### 5. Self-Service Utilisateurs & Emails 📧
* Envoi automatique d'email via `@nestjs-modules/mailer` & **Mailtrap**.
* Inscription -> Envoi d'un lien de **Validation d'E-mail**.
* Oubli de mot de passe -> Envoi d'un **Lien de Réinitialisation**.
* Vraies templates interactives et responsives générées grâce à **EJS** (`.ejs`).

### 6. Autorisations et Système de Rôles (RBAC) 👮
* Accès universel par défaut restreint (toutes les routes API sont verrouillées, sauf exception via `@Public()`).
* Décorateur conditionnel `@Roles(Role.ADMIN)` pour sécuriser les routes en fonction de l'échelle des utilisateurs.
* **RolesGuard** mis en place derrière l'Authentification (JWT) pour garantir un deuxième contrôle intransigeant des Permissions (`USER`, `MODERATOR`, `ADMIN`).

### 7. Double Authentification (2FA) Google Authenticator 📱
* Intégration de librairie `otplib` pour respecter le standard TOTP.
* L'API génère un QR code à configurer dans Authy/Google Authenticator.
* Si le porteur du compte a activé la 2FA, l'API intercepte sa connexion et lui délivre un _Partial Token_ de 5 min qui lui permet d'accéder au check d'authentification 2FA pour être connecté avec succès !

### 8. Authentification Sociale OAuth 2.0 (Google) 🌐
* Intégration de Passport Google.
* Si l'e-mail a fuité ou s'il connait déjà votre site: Fusion parfaite ("Find-Or-Create") des anciens comptes avec le profil OAuth dans Postgres !

---

## 💻 Tech Stack Principale

* [NestJS](https://nestjs.com/)
* [PostgreSQL](https://www.postgresql.org/)
* [Prisma](https://www.prisma.io/)
* [Redis](https://redis.io/)
* [Passport](https://www.passportjs.org/)
* [Swagger](https://swagger.io/)
* Moteur EJS (Templates d'e-mail)

---

## 🛠️ Configuration & Installation

### 1. Récupérer le projet

```bash
git clone <votre-depot>
cd nestjs-boilerplate
npm install
```

### 2. Configuration Environnement

Créez un fichier `.env` à la racine (clonez `.env.example` s'il existe) et adaptez-le :
```env
# PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/nest-auth"

# JWT Auth
JWT_SECRET="supers3cr3t"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="anoth3rsup3rs3cr3t"
JWT_REFRESH_EXPIRATION="7d"

# Redis Server (Obligatoire pour la Blacklist - Logout)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# SMTP Mailtrap
MAIL_HOST="live.smtp.mailtrap.io"
MAIL_PORT=587
MAIL_USER="api"
MAIL_PASSWORD="<votre_token>"
MAIL_FROM="hello@demomailtrap.co"
```

### 3. Exécuter les Migrations (Base de de données)

```bash
# Push le schéma Prisma sur le serveur SQL
npx prisma db push
# Ou via migrate dev si vous désirez versionner la table Postgres
npx prisma migrate dev
```

### 4. Lancement de l'Application

```bash
# Mode développement avec auto-reload
npm run start:dev

# Compilation pour la production
npm run build
npm run start:prod
```

L'API est accessible immédiatement en local sur `http://localhost:3000/api`.
Découvrez toute la documentation API sur `http://localhost:3000/api/docs`.

---

## 🚀 Fin du Projet (Boilerplate Ultime)

Ce projet dispose du meilleur état de l'art de l'authentification et de la sécurité des API NestJS. Il est structuré, modulaire et peut accueillir l'ensemble de votre architecture métier en quelques secondes !
# boilerplate_nestjs_ultime
