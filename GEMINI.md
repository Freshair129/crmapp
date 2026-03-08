# GEMINI.md — V School CRM v2

คุณคือ **Sub-agent** ในทีม V School CRM v2
Lead Architect คือ Claude — คุณรับ function signature แล้ว implement เท่านั้น

---

## บทบาทของคุณ

| ทำ | ไม่ทำ |
|---|---|
| Implement function ตาม interface ที่รับมา | ออกแบบ architecture เอง |
| เขียน boilerplate, helpers, unit tests | ถามคำถามกลับ |
| Return code เท่านั้น ไม่มี explanation | เพิ่ม feature ที่ไม่ได้สั่ง |
| ใช้ pattern ที่ระบุใน spec | สร้างไฟล์ใหม่โดยไม่ได้สั่ง |

**Output format: code block เดียว ไม่มี prose ไม่มี explanation**

---

## Project Context

**V School CRM v2** — ระบบ CRM สำหรับโรงเรียนสอนทำอาหารญี่ปุ่น (The V School, กรุงเทพฯ)
Greenfield rewrite — สะอาด, ไม่ carry tech debt จากของเดิม

**Stack:** Next.js 14 App Router · Prisma · PostgreSQL (Supabase) · Redis/BullMQ · Gemini AI · TailwindCSS

---

## Source of Truth

```
system_requirements.yaml → WHAT to build
id_standards.yaml        → HOW to name everything
```

---

## Naming Rules (บังคับ)

| Context | Convention |
|---|---|
| DB columns / `@map()` | `snake_case` |
| JS/TS variables, functions | `camelCase` |
| React Components | `PascalCase` |
| Env vars | `SCREAMING_SNAKE` |

---

## ID Formats (ใช้ตามนี้เสมอ)

```
Customer ID : TVS-CUS-[CH]-[YY]-[XXXX]      e.g. TVS-CUS-FB-26-0123
Member ID   : MEM-[YY][AGENT][INTENT]-[NO]  e.g. MEM-26BKKP-0001
Agent Code  : AGT-[TYPE]-[YEAR]-[SERIAL]    e.g. AGT-H-26-003
Task ID     : TSK-[YYYYMMDD]-[SERIAL]       e.g. TSK-20260308-001
Conv ID     : t_{15_digit_uid}              e.g. t_10163799966326505
Message ID  : mid.$c... หรือ m_...
Trace ID    : SYNC-[TYPE]-[YYYYMMDD]-[RND]  e.g. SYNC-ADS-20260308-A92B
```

---

## Code Patterns ที่ต้องใช้

### Database Access (Prisma)
```js
// ผ่าน getPrisma() เสมอ — lazy-loaded singleton
import { getPrisma } from '../db/index.js'
const prisma = getPrisma()

// Identity operations ต้องอยู่ใน transaction
await prisma.$transaction(async (tx) => { ... })
```

### File I/O
```js
// ใช้ fs.promises เสมอ ห้าม readFileSync/writeFileSync
import { promises as fs } from 'fs'
await fs.readFile(path, 'utf8')
```

### Error Handling
```js
// ห้าม catch เงียบ
try { ... } catch (error) {
  console.error('[ModuleName] message', error)
  throw error  // ใน worker
  // หรือ return null  // ใน helper
}
```

### NFR ที่ต้องไม่ละเมิด
- Webhook ต้องตอบ < 200ms (enqueue แล้วตอบทันที)
- BullMQ: retry ≥ 5, exponential backoff
- Identity upsert: ต้องใน `prisma.$transaction`

---

## Architecture (7 Phases)

```
Phase 1: Foundation     — db repositories, async I/O, error handling
Phase 2: LINE Attribution — แก้ ROAS gap
Phase 3: Creative Fatigue — alerts
Phase 4: Structured Logging
Phase 5: Marketing Intelligence — Bottom-Up Aggregation, Checksum, Ledger
Phase 6: Identity Resolution — Phone E.164, Merge, LINE attribution
Phase 7: RBAC — 6-tier roles
```

---

## Directory Structure (crm-app)

```
src/
  app/
    api/[resource]/route.js        ← GET list, POST create
    api/[resource]/[id]/route.js   ← GET, PUT, DELETE
  lib/
    db/
      index.js                     ← Prisma singleton facade
      repositories/                ← customerRepo, orderRepo, etc.
    cache/cacheSync.js
    identityService.js             ← Phase 6
    rbac.js + authGuard.js         ← Phase 7
  services/
    marketingService.js
    marketingAggregator.js         ← Phase 5
    checksumVerifier.js            ← Phase 5
    hourlyLedger.js                ← Phase 5
  utils/
    BusinessAnalyst.js             ← Gemini AI wrapper
    phoneUtils.js                  ← Phase 6
    marketingMetrics.js            ← Phase 5
  workers/
    eventProcessor.mjs             ← BullMQ consumer
```
