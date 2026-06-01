# apps/backoffice/Dockerfile
# Context should be the root of the monorepo

# --- 1. Base Node ---
FROM node:20-alpine AS base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- 2. Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/backoffice/package.json ./apps/backoffice/
RUN npm install

# --- 3. Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# We disable telemetry to avoid collecting data during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=backoffice

# --- 4. Production Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# In a monorepo, Next.js standalone output usually puts the server in standalone/apps/backoffice
COPY --from=builder --chown=nextjs:nodejs /app/apps/backoffice/public ./apps/backoffice/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/backoffice/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/backoffice/.next/static ./apps/backoffice/.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "apps/backoffice/server.js"]
