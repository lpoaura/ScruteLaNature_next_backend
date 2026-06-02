# apps/backoffice/Dockerfile
# Context: racine du monorepo (docker build -f apps/backoffice/Dockerfile .)

# --- 1. Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
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

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* est une variable build-time : elle doit être passée en ARG
# pour être injectée dans le bundle JS au moment du build.
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

RUN npm run build --workspace=backoffice

# --- 4. Production Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Sécurité : ne pas tourner en root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Dossier cache pour le pre-rendering
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copier le standalone output (contient node_modules tracés + server.js)
COPY --from=builder --chown=nextjs:nodejs /app/apps/backoffice/.next/standalone ./
# Copier les assets statiques
COPY --from=builder --chown=nextjs:nodejs /app/apps/backoffice/.next/static ./apps/backoffice/.next/static
# Copier le dossier public (favicons, images statiques)
COPY --from=builder --chown=nextjs:nodejs /app/apps/backoffice/public ./apps/backoffice/public

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/backoffice/server.js"]
