# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma.config.ts ./
RUN npm ci

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (output → src/generated/prisma-client)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Runner (production) ────────────────────────────────────────────
FROM node:20-alpine AS runner
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

# Prisma CLI binary (devDep — not in standalone node_modules, must copy explicitly)
# NOTE: Do NOT copy node_modules/.bin/prisma — it's a symlink on macOS and Docker
#       COPY resolves symlinks to plain files, breaking __dirname-based WASM lookup.
#       Create the symlink ourselves instead.
COPY --from=builder /app/node_modules/prisma              ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma             ./node_modules/@prisma

# data/ directory for runtime JSON files (ad-mapping, etc.)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# entrypoint: migrate then start
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p ./node_modules/.bin && \
    ln -sf /app/node_modules/prisma/build/index.js ./node_modules/.bin/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
