---
name: domain-infra
description: >
  Context loader for Infrastructure/Shared layer (DB, cache, auth, workers).
  Use when working on Prisma schema, Redis caching, RBAC middleware, BullMQ workers,
  Docker services, deployment, cron jobs, event bus, or audit logging.
  Covers ADR-026 (RBAC), ADR-029 (Employee Registry), ADR-034 (Redis Caching).
---

# Domain: Infrastructure / Shared Layer

## Scope

This domain covers shared services that all other domains depend on:
database connection, caching, authentication, authorization, background workers,
event bus, audit logging, and deployment infrastructure.

**Trigger keywords:** prisma, redis, cache, auth, RBAC, middleware, worker, BullMQ, docker, cron, deploy, employee, audit, migration

---

## Architecture Decisions

### ADR-026: RBAC 6-Tier Role Hierarchy
```
DEVELOPER  = 5  (full access)
MANAGER    = 4  (everything except dev tools)
ADMIN      = 4  (same level as Manager — school owner/director)
SUPERVISOR = 3  (marketing + chat + reports)
AGENT      = 1  (chat + customers only)
GUEST      = 0  (read-only dashboard)
```

### ADR-029: Employee Registry
- Auto-generate `TVS-EMP-YYYY-XXXX` IDs
- JSONB `identities` field for multi-platform attribution: `{ facebook: { psid, name }, line: { id } }`
- Password hashing: `bcryptjs` salt rounds = 12

### ADR-034: Redis Caching Layer
- Pattern: `cache.getOrSet(key, fetcher, ttl)` for expensive queries
- Default TTL: 300 seconds (5 minutes)
- Graceful degradation: if Redis unavailable, fallback to direct DB query

---

## Docker Services (`docker-compose.yml`)

| Service | Image | Port | Purpose |
|---|---|---|---|
| postgres | postgres:16-alpine | **5433**:5432 | Primary database |
| redis | redis:7-alpine | 6379:6379 | Cache + BullMQ queue |
| migrator | Next.js (build target) | — | One-shot Prisma migration |
| app | Next.js (prod build) | 3000:3000 | Application server |

**Healthcheck:** interval=10s, timeout=5s, retries=5 for both postgres and redis.

---

## Database Connection (`src/lib/prisma.ts`)

**Pattern: Driver Adapter**
```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Pool config:
// max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000

// Singleton guard:
globalForPrisma.prisma ?? createPrismaClient()
```

- Uses `@prisma/adapter-pg` (native PostgreSQL driver) — NOT query engine
- Logging: dev = `['query','info','warn','error']`; prod = `['error']` only
- Access: `import { getPrisma } from '@/lib/db'`
- **All DB ops MUST go through repository layer** (`src/lib/repositories/`)

### Important: Scripts vs App
- **App code:** use `getPrisma()` or `import { prisma } from '@/lib/prisma'`
- **Scripts (*.mjs):** use raw `pg.Client` directly — `new PrismaClient()` fails without adapter setup
- **`updated_at`:** has NO DB default; must supply `now()` in raw INSERT

---

## Redis Cache (`src/lib/redis.js`)

**Client:** `ioredis` singleton → `redis://localhost:6379`

**Core API:**
```js
cache.get(key)                          // GET → JSON parse, null on fail
cache.set(key, value, ttlSeconds=300)  // SET EX, default 5 min
cache.getOrSet(key, fetcher, ttl=300)  // Cache-aside pattern
cache.del(key)                          // DELETE
```

**Retry:** exponential backoff capped at 2000ms, max 3 retries
**Graceful degradation:** returns null/false on failure, never throws

**Key Naming Convention:**
```
analytics:executive:{timeframe}
sheets:sync_config
```

---

## RBAC Middleware (`src/middleware.js`)

**Route → Required Role:**
```
/api/auth              → null (NextAuth exempt)
/api/webhooks          → null (signature-based auth)
/api/members/register  → null (public)
/api/employees/*       → MANAGER (4)
/api/marketing/*       → SUPERVISOR (3)
/api/analytics/*       → SUPERVISOR (3)
/api/customers/*       → AGENT (1)
/api/*                 → AGENT (1) [catch-all]
```

**Enforcement:**
1. Read JWT from NextAuth cookie via `getToken()`
2. 401 if no token, 403 if role insufficient
3. `hasPermission(userRole, requiredRole)`: `ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole]`

---

## Employee Model

```prisma
Employee {
  id, employeeId (unique, TVS-EMP-YYYY-XXXX)
  firstName, lastName, nickName, email (unique), phone, department
  passwordHash (bcrypt salt=12)
  role (DEVELOPER|MANAGER|SUPERVISOR|ADMIN|AGENT|GUEST)
  status (ACTIVE|INACTIVE)
  identities (JSON: { facebook: { psid, name }, line: { id } })
  permissions (JSON: granular overrides like ["edit_orders"])
  lastLoginAt
}
```
**Relations:** assignedTasks[], respondedMessages[], assignedConversations[], closedOrders[]

### Seeded Employees
| ID | Name | Role |
|---|---|---|
| TVS-EMP-2026-0001 | Admin User | ADMIN |
| TVS-EMP-2026-0002 | Pornpol | ADMIN |
| TVS-EMP-2026-0003 | Fafah Fasai | AGENT |
| TVS-EMP-2026-0004 | Satabongkot (Aoi) | AGENT |

---

## AuditLog Model

```prisma
AuditLog {
  id, action (CREATE|UPDATE|DELETE|LOGIN)
  actor (employeeId or 'system')
  target (resource ID), status (PENDING|SUCCESS|FAILED)
  traceId (SYNC-[TYPE]-YYYYMMDD-XXXX)
  details (JSON: before/after snapshot)
}
```
**Indexes:** (action, createdAt), (target)

---

## BullMQ Worker (`src/workers/eventProcessor.mjs`)

- Run: `npm run worker`
- Queue name: `fb-events`
- Retry: >= 5 times, exponential backoff (NFR3)
- Processes webhook events asynchronously
- Imports: `bullmq.Worker`, `ioredis`

---

## Instrumentation / Cron (`src/instrumentation.js`)

| Schedule | Time (Bangkok) | Job |
|---|---|---|
| `0 9 * * *` | 09:00 daily | Creative Fatigue Detection → LINE alert |
| `0 8 * * *` | 08:00 daily | Google Sheets Daily Summary |
| `*/5 * * * *` | Every 5 min | Dynamic Google Sheets Sync (if auto mode) |

**Library:** `node-cron` (runs in Next.js process)
**Guard:** `NEXT_RUNTIME === 'nodejs'` + `global.__cron_registered` singleton
**Known issue:** node-cron in same process as Next.js can miss executions under load → plan to migrate to BullMQ repeatable jobs

---

## Event Bus (`src/lib/eventBus.js`)

- Node.js `EventEmitter` singleton
- Max listeners: 100 (for SSE clients)
- Used for real-time UI updates via `/api/events/stream` (SSE)

---

## Key Dependencies

```
next@15.0.0, next-auth@4.24.11
@prisma/client@7.4.0, @prisma/adapter-pg@7.4.0, pg@8.18.0
ioredis@5.4.1, bullmq@5.12.0
bcryptjs@3.0.3, node-cron@4.2.1
@google/generative-ai (Gemini)
```

---

## NFR Enforcement Points

| NFR | Where | How |
|---|---|---|
| NFR1 (Webhook < 200ms) | `/api/webhooks/*` | Fire-and-forget → BullMQ |
| NFR2 (Dashboard < 500ms) | API routes | Redis `cache.getOrSet()` |
| NFR3 (Retry >= 5x) | `eventProcessor.mjs` | BullMQ exponential backoff |
| NFR5 (Atomic upsert) | Identity resolution | `prisma.$transaction()` |

---

## Naming Conventions

| Context | Convention | Example |
|---|---|---|
| DB columns / @map | snake_case | `customer_id` |
| JS/TS code | camelCase | `customerId` |
| Components | PascalCase | `CustomerList` |
| Env vars | SCREAMING_SNAKE | `FB_PAGE_ACCESS_TOKEN` |
| Log prefix | [ModuleName] | `[Redis]`, `[Middleware]` |
| Repository | camelCase + "Repo" | `customerRepo`, `analyticsRepository` |

---

## Cross-Domain: What Other Domains Need From Infra

| Consumer | Uses |
|---|---|
| All domains | `getPrisma()`, repository pattern, `cache.getOrSet()` |
| Inbox | SSE via eventBus, BullMQ for webhook processing |
| Marketing | Cron jobs for sync/fatigue, Redis cache for dashboards |
| Customer | `prisma.$transaction()` for identity merge (NFR5) |
