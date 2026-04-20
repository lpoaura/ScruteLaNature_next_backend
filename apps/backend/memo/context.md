# 🗂️ Contexte du Projet : NestJS Boilerplate Auth

Ce document sert de "carte d'identité" et de référence de bout en bout pour le projet. Il permet de comprendre instantanément l'architecture mise en place, les choix technologiques et les fonctionnalités déjà implémentées.

---

## 🎯 Objectif Principal
Fournir une base de code (Boilerplate) backend prête pour la production avec **NestJS**. Le focus est mis sur la **sécurité maximale**, la **gestion avancée de l'authentification** et la **préparation à la mise à l'échelle** pour n'importe quelle future application complexe (SaaS, E-commerce, App Mobile).

---

## 🛠️ Stack Technique

* **Framework Core** : NestJS (TypeScript strict)
* **Système de Base de Données** : PostgreSQL
* **ORM (Object-Relational Mapping)** : Prisma
* **Cache & In-Memory Store** : Redis (via `@liaoliaots/nestjs-redis`)
* **Authentification & Sécurité** : Passport.js, JWT (`@nestjs/jwt`), Bcrypt, Helmet, Express-Rate-Limit
* **Service d'E-mails** : `@nestjs-modules/mailer` (Nodemailer) avec gabarits **EJS** (Mailtrap pour le DEV local)
* **Documentation** : Swagger (`@nestjs/swagger`)

---

## 🏗️ Architecture du Code (Structure des dossiers)

L'architecture est modulaire et fortement typée, respectant le paradigme de "Séparation des Préoccupations" propre à NestJS.

```text
src/
├── app.module.ts              # Module racine de l'application, configure globalement Redis, les Emails, les modules de base, et les Guards de sécurité globaux
├── main.ts                    # Point d'entrée : Configuration Swagger, Middlewares de sécurité (Helmet/Rate-Limiting)
├── common/                    # Briques partagées utiles à tous les modules
│   ├── decorators/            # Décorateurs personnalisés : @Public(), @Roles(), @CurrentUser()
│   ├── guards/                # Gardiens (Gérants des accès) : JwtAuthGuard, RolesGuard, LocalAuthGuard, JwtRefreshAuthGuard
├── core/ ou database/         # Contient le PrismaService pour faire le lien avec la base de données
├── modules/                   # Le cœur de métier
│   ├── auth/                  # Module clé de la plateforme. Contrôleur système (Routes /login, /refresh, /logout, /verify-email, etc.), Service Authentification et stratégies (Local, JWT, RefreshToken)
│   ├── users/                 # Gestion CRUD de la base utilisateurs (Service/Controllers dédiés et restreints par Rôles)
└── providers/                 # Services et adaptateurs externes
    ├── mail/                  # Templates interactifs EJS et MailService pour la messagerie
    └── redis/                 # Interface permettant les échanges avec la RAM serveur (Blacklist)
```

---

## 🚀 Fonctionnalités Implémentées (Le parcours accompli)

### Étape 1 : Fondations et Modélisation
- Mise en place du socle technique et du schéma de base de données complet `prisma/schema.prisma` : `User`, `Session` (pour les RefreshTokens), `VerificationToken` (pour les e-mails) et `OAuthAccount`.

### Étape 2 : Documentation API
- Outil **Swagger** interfacé à l'adresse `/api/docs`.
- Les contrôleurs respectent les normes Open-API via les décorateurs `@ApiTags`, `@ApiResponse`, `@ApiBearerAuth`, et `@ApiBody` pour fluidifier le travail futur du développeur Front-end.

### Étape 3 : Blindage Sécurité (Middlewares)
- Injection de `Helmet` et limitation des flux via `x-rate-limit` pour prévenir les attaques d'énumération par des bots non autorisés.
- Cadrage automatique de toutes les `Request` avec des DTO validés dynamiquement par `class-validator` (ex: interdire les mots de passe trop simples).

### Étape 4 : Le Flux API JWT Sécurisé (Access, Refresh & Blacklist)
- Sécurisation de toutes les routes de l'API avec un `JwtAuthGuard` globalement (Exceptions par route via `@Public()`).
- Le `login` génère un *Access Token* (15 min) et un *Refresh Token* (7 jours) haché et stocké en session sur Postgres.
- **Réussite sécuritaire avancée : Redis.** Lorsqu'un utilisateur provoque un `/logout`, le JWT *Access Token* est intercepté et propulsé instantanément dans une "Blacklist" locale sous Redis avec un TTL (Time To Live). Il devient inutilisable. 

### Étape 5 : Self-Service, Tokens et Mails Transactionnels
- À l'inscription, génération d'un `VerificationToken` cryptographique.
- Intégration de `Nodemailer / Ejs`. L'API envoie silencieusement un email ("Vérifiez votre compte") avec un bouton stylisé contenant le Token.
- Implémentation du système `Mot de passe perdu` : L'API détecte le compte, génère un lien de réinitialisation sécurisé, envoie l'e-mail, prend en compte le nouveau mot de passe et révoque de façon brutale les `Sessions` pour déconnecter tous les appareils du compte piraté ou perdu.

### Étape 6 : Mécanique RBAC (Contrôle d'Accès Basé sur les Rôles)
- Mise en œuvre d'un `RolesGuard` s'assurant que l'utilisateur décrypté par le token détient les droits.
- Création du décorateur simple `@Roles(Role.ADMIN)`. L'API permet l'effacement et le requêtage massif (`findAll`) seulement pour la classe Admin. Les autres obtiendront un `403 Forbidden`.

### Étape 7 : Double Authentification (2FA) avec Google Authenticator / Authy 🛡️
- Utilisation de `otplib` (TOTP standard RFC 6238) pour la génération des codes à 6 chiffres.
- Utilisation de `qrcode` pour générer un QR Code lisible directement par les apps d'authentification.
- Flux complet en 4 routes :
  - `GET /auth/2fa/generate` : Génère un secret TOTP, le stocke en BDD, retourne le QR code (base64).
  - `POST /auth/2fa/activate` : Vérifie le premier code TOTP pour confirmer le scan et active `isTwoFactorEnabled`.
  - `POST /auth/2fa/disable` : Désactive la 2FA après vérification d'un code valide.
  - `POST /auth/2fa/authenticate` : Route **clé du flux de connexion 2FA**. Échange le `partial_token` (token court 5min) + le code TOTP contre les vrais tokens JWT (Access + Refresh).
- Modification du Login : si `isTwoFactorEnabled`, retourne un `partial_token` temporaire (5 min) au lieu des tokens définitifs.
- Le `partial_token` encode `{ isTwoFactorAuthenticated: false }` pour différencier les tokens partiels des vrais tokens.

---

### Étape 8 : Authentification Sociale (OAuth 2.0 / Google) 🌐
- Intégration de `passport-google-oauth20` et sécurisation du flux OAuth2 classique de NestJS.
- Scénario `Find-Or-Create` : 
  - Si l'utilisateur a déjà un compte avec son e-mail, la plateforme lie automatiquement son profil via la table `OAuthAccount`.
  - Sinon, elle crée silencieusement un nouveau compte en utilisant les données de Google (`isEmailVerified` passera directement à `true`).
- 2 Routes clés construites :
  - `GET /api/auth/google` : Déclenche la redirection sécurisée vers la *consent page* de Google.
  - `GET /api/auth/google/callback` : Réceptionne les données Google, connecte en backend et génère les JWT complets.

---

## 🔚 Fin du Boilerplate
L'ensemble des objectifs ont été accomplis. L'API est ultra-sécurisée, modulaire et prête à encaisser tous types de business logics.
