# apps/backend/Dockerfile
# Context: racine du monorepo (docker build -f apps/backend/Dockerfile .)

# --- 1. Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# --- 2. Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/backoffice/package.json ./apps/backoffice/
RUN npm ci

# --- 3. Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd apps/backend && npx prisma generate
RUN npm run build --workspace=backend

# --- 4. Production Runner ---
FROM base AS runner
WORKDIR /app/apps/backend

ENV NODE_ENV=production

# Copier les node_modules (nécessaires à l'exécution)
COPY --from=builder /app/node_modules /app/node_modules

# Copier le code compilé
COPY --from=builder /app/apps/backend/dist ./dist

# Copier les fichiers Prisma (schéma + migrations pour prisma migrate deploy)
COPY --from=builder /app/apps/backend/prisma ./prisma

# Copier le package.json du backend (pour les scripts npm éventuels)
COPY --from=builder /app/apps/backend/package.json ./package.json

# Copier les assets publics (logo LPO, etc.) s'ils existent
COPY --from=builder /app/apps/backend/public ./public

# Créer le dossier uploads (sera monté en volume en prod)
RUN mkdir -p uploads/images uploads/audio uploads/gpx uploads/specific_images uploads/specific_audio uploads/specific_gpx

# Script d'entrypoint : migration auto + démarrage
COPY --from=builder /app/apps/backend/.entrypoint.sh ./entrypoint.sh

EXPOSE 3000

CMD ["./entrypoint.sh"]
