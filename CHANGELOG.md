# Changelog — Semaine du 12 au 19 mai 2026

## 19 mai 2026 — Corrections UI/UX

### Jeux qui disparaissaient après enregistrement d'une étape (`etapes.service.ts`)
Le backend Prisma renvoyait l'étape sans inclure les jeux associés. Le frontend remplaçait l'étape dans le state local par cette version « vide » → les jeux disparaissaient visuellement (mais existaient toujours en base). Fix : ajout de `include: { jeux: true }` sur les requêtes `create` et `update` dans `etapes.service.ts`.

### Hydration mismatch sur le toggle dark mode (`Header.tsx`)
`useTheme()` retourne `undefined` côté serveur, causant un mismatch React entre le rendu SSR et client sur le `title` et l'icône du bouton. Fix : ajout d'un `mounted` state + `suppressHydrationWarning` sur le bouton + utilisation de `resolvedTheme` (résout `'system'` en `'dark'`/`'light'` réel).

---

## 19 mai 2026 — Robustesse de la gestion des tokens JWT

### Refresh proactif (`api-client.ts`)
Avant chaque requête API, le JWT est décodé côté client. Si le token expire dans moins de 2 minutes, il est renouvelé **avant** d'envoyer la requête — plus jamais de 401 inattendu en plein milieu d'une action.

### Mutex anti-concurrence (`api-client.ts`)
Quand plusieurs requêtes API partent en parallèle et détectent toutes un token expirant, elles partagent le **même** appel refresh au lieu d'en déclencher plusieurs simultanément (ce qui causait des conflits de rotation de token côté backend).

### Refresh silencieux au retour d'onglet (`AutoLogoutProvider.tsx`)
Au retour sur l'onglet du backoffice, le composant vérifie immédiatement si le token est encore valide et le rafraîchit si nécessaire — évite le flash de déconnexion inattendu.

---

## 12 mai 2026 — Correction accès EDITOR sur Avis & Modération

### Problème
L'EDITOR obtenait une erreur 403 en accédant à la page « Avis & Modération » du backoffice, car l'endpoint `GET /api/social/reviews/admin/all` était restreint aux rôles `ADMIN` et `SUPER_ADMIN`.

### Corrections backend
- **`social.controller.ts`** : ajout de `Role.EDITOR` sur le décorateur `@Roles` de `GET /social/reviews/admin/all`
- **`social.service.ts`** : ajout de `Role.EDITOR` dans le check `isAdmin` de la méthode `deleteReview`, permettant à l'EDITOR de supprimer des avis de son organisme

### Comportement attendu
- L'EDITOR voit uniquement les avis des parcours de son organisme (filtrage automatique par `organismeId`)
- L'EDITOR peut supprimer ces avis (modération)
- ADMIN et SUPER_ADMIN conservent leurs droits étendus

---

## 13 mai 2026 — Sidebar collapsible + améliorations UI

### Sidebar collapsible (`Sidebar.tsx`)
Refonte complète de la barre latérale pour qu'elle se replie sur les icônes :

- **État replié/déplié** — `useState` + persistance dans `localStorage` (`sidebar-collapsed`)
- **Largeur** — `w-64` (étendu) ↔ `w-20` (replié), transition `duration-200`
- **Mode icône** — labels masqués, liens centrés, tooltip `title` natif au survol
- **Bouton toggle** — icône `PanelLeft` (pivote de 180° selon l'état) dans le header
- **Profil** — cercle avec initiales en mode replié, nom + rôle en mode étendu
- **Header replié** — hauteur dynamique (`h-auto`) pour éviter le débordement qui déformait la bordure horizontale
- **Hydration-safe** — fallback `w-64` côté serveur, état réel après `mounted`

### Réorganisation nav
Ordre des items : Tableau de bord → Zonages → Parcours → Médiathèque → Avis & Modération → Statistiques → Mon Équipe → Réseau National

### Éditeur Tracé & Étapes (`ParcoursMapEditor.tsx`)
- Passage du layout de `grid-cols-3` (2/3 + 1/3) à `grid-cols-12` (6/12 + 6/12) pour donner plus de place au panneau « Les Étapes »

---

## 13–19 mai 2026 — Dark Mode

### Installation
```bash
npm install next-themes --workspace=backoffice
```

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `app/layout.tsx` | Ajout `ThemeProvider` + `suppressHydrationWarning` sur `<html>` |
| `src/components/layout/ThemeProvider.tsx` | Nouveau — wrapper `next-themes` avec `attribute="class"`, `defaultTheme="system"` |
| `src/components/layout/Header.tsx` | Ajout bouton toggle `Sun`/`Moon` avant la cloche |

### Comportement
- **Thème par défaut** : suit le thème système de l'OS
- **Persistance** : choix sauvegardé dans `localStorage` par `next-themes`
- **Variables CSS** : les tokens `.dark` étaient déjà définis dans `globals.css` — aucun changement CSS nécessaire
- **Pas de flash** : `suppressHydrationWarning` sur `<html>` évite le FOUC (Flash of Unstyled Content)
