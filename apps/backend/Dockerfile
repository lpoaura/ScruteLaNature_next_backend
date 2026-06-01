# apps/backend/Dockerfile
# Context should be the root of the monorepo

# --- 1. Base Node ---
FROM node:20-alpine AS base
# Prisma needs openssl
RUN apk add --no-cache openssl
WORKDIR /app

# --- 2. Dependencies ---
FROM base AS deps
# Copy only package files to cache dependencies
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/backoffice/package.json ./apps/backoffice/

# Install all dependencies (npm ci is better but npm install is safer if lockfile is out of sync)
RUN npm install

# --- 3. Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Generate Prisma Client
RUN cd apps/backend && npx prisma generate
# Build the backend
RUN npm run build --workspace=backend

# --- 4. Production Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built code and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/node_modules ./node_modules

# Add entrypoint script to run migrations then start the app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd apps/backend' >> /app/start.sh && \
    echo 'echo "Running Prisma Migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'node dist/main' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
