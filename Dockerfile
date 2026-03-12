# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma.config.ts ./
RUN npm ci

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (output → src/generated/prisma-client)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Migrator ───────────────────────────────────────────────────────
# Runs `prisma migrate deploy` once at startup, then exits.
# Needs full node_modules because Prisma v7 CLI loads @prisma/dev eagerly
# (which requires valibot, hono, @electric-sql/pglite, etc. — all devDeps).
# Keeping this in a separate stage preserves the slim runner image.
FROM node:22-alpine AS migrator
WORKDIR /app

COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder /app/node_modules     ./node_modules

CMD ["node", "./node_modules/prisma/build/index.js", "migrate", "deploy"]

# ─── Stage 4: Runner (production) ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public        ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

# Prisma: config + migrations + generated client
# prisma.config.ts MUST be in runner stage — Prisma v7 requires it for DATABASE_URL
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# @prisma/adapter-pg + generated client dependencies (runtime, NOT the CLI)
# The `prisma` CLI is only in the `migrator` stage — not needed here.
COPY --from=builder /app/node_modules/@prisma             ./node_modules/@prisma

# data/ directory for runtime JSON files (ad-mapping, etc.)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# entrypoint: just start Next.js (migrations handled by migrator service)
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
