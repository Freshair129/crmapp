# GEMINI.md — V School CRM v2 Sub-agent (CLI)

> [!IMPORTANT]
> ไฟล์นี้สำหรับ **Gemini CLI Sub-agent** (Worker) เท่านั้น
> หากคุณคือ **Antigravity (IDE Agent)** ให้ยึดตาม `ANTIGRAVITY.md` เป็นหลัก

Lead Architect คือ Claude — คุณรับ function signature แล้ว implement เท่านั้น

---

## 🏷️ Version Status (อ่านก่อนเริ่มงานทุกครั้ง)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0` – `v0.16.0` | Auth → Recipe/Package | ✅ released |
| `v0.18.0` | Production Hardening & API Optimization | ✅ released |
| `v0.19.0` | Schema Hardening | ✅ released |
| `v0.20.0` | Lot ID + Class ID (Stock Batches + Cohorts) | ✅ released |
| `v0.21.0` | Bug Audit Fix + Repository Layer Refactor | ✅ released ← HEAD |
| `v1.0.0` | Production Ready | 🔲 planned |

**branch `master`** = งานประจำวัน · **branch `stable`** = ชี้ที่ v0.12.0
Phase 17 Repository Refactor = ✅ DONE · Phase 21 FEFO Deduction = 🔲 NEXT

> ⚠️ **ถ้า task ที่รับมา ≠ version HEAD ใน CHANGELOG.md → หยุดและแจ้ง Claude ก่อนเสมอ**
> อย่า implement งานที่อาจซ้ำ/outdated โดยไม่ยืนยัน

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

**Stack:** Next.js 14 App Router · Prisma · PostgreSQL (Supabase) · Redis/BullMQ · Gemini AI · TailwindCSS · Node.js v22 LTS

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

### API Route Pattern (Next.js 14 App Router)
```js
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(request) {
    try {
        const prisma = await getPrisma();
        // ... logic
        return NextResponse.json(result);
    } catch (error) {
        logger.error('[ModuleName]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

### Database Access
```js
import { getPrisma } from '@/lib/db';
const prisma = await getPrisma();
// Identity upserts → ต้องใน prisma.$transaction
```

### Error Handling (ห้าม catch เงียบ)
```js
try { ... } catch (error) {
  logger.error('[ModuleName]', 'action failed', error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
```

### NFR
- Webhook ตอบ < 200ms
- BullMQ retry ≥ 5, exponential backoff
- Identity upsert ต้องใน `prisma.$transaction`

---

## Architecture Phases

```
Phase 13-16: [DONE]    NotificationRules → Asset/PR/Kitchen → Recipe/Package
Phase 18:    [DONE]    Production Hardening & API Optimization
Phase 19:    [DONE]    Schema Hardening
Phase 20:    [DONE]    Lot ID + Class ID
Phase 20.5:  [DONE]    Bug Audit & Fix (6 bugs — crash/wrong data/stub)
Phase 17:    [DONE]    Repository Layer Refactor (inboxRepo + marketingRepo)
Phase 21:    [NEXT]    FEFO Deduction in completeSessionWithStockDeduction
```

## 📋 Changelog System (รู้ไว้ — ไม่ต้อง implement)

CHANGELOG ใหม่ใช้ **Sliding Window**:
- `CHANGELOG.md` = LATEST pointer + Index table (older) + 5 full entries ล่าสุด
- `changelog/CL-[YYYYMMDD]-[NNN].md` = full detail แยกต่างหาก (root-level dev tooling)

**Gemini ไม่ต้องอัปเดต changelog** — Claude เป็นคนทำ
แต่ถ้า task ที่รับมาขัดแย้งกับ version ใน CHANGELOG → แจ้ง Claude ก่อน

---

## Phase 11 — COMPLETED ✅

| Task | Status | Notes |
|---|---|---|
| B1 `api/products` POST/PUT/DELETE | ✅ DONE | soft-delete via isActive=false |
| B2 `api/analytics/executive` GET | ✅ DONE | แยก adsRevenue / storeRevenue ด้วย conversationId |
| A1 AuditHistory | ✅ DONE | ต่อ GET /api/orders |
| A2 InventoryManager | ✅ DONE | ต่อ CRUD /api/products |
| A3 PremiumPOS | ✅ DONE | ต่อ /api/products + customer lookup + POST /api/orders |
| A4 ExecutiveAnalytics | ✅ DONE | แสดง Total / Ads / Store Revenue + % change |

### Revenue Classification Logic (สำคัญ)
- Order มี `conversationId` → **Ads Revenue** (ออนไลน์/Facebook)
- Order ไม่มี `conversationId` → **Store Revenue** (Walk-in/หน้าร้าน)

---

## Phase 12 — DONE ✅ (tagged v0.13.0, 2026-03-13)

### v0.12.0 — เสร็จแล้วทั้งหมด ✅ (tagged 2026-03-13)
- `Sidebar.js` — icon-only `w-20`, Lucide React, tooltip on hover (ADR-031)
- `TopBar.js` — Global Search, Language, Theme toggle (Lucide icons ครบ)
- `ExecutiveAnalytics.js` — Recharts AreaChart + BarChart + **Lucide icons ครบ** (ADR-032 A1)
- `Dashboard.js` — Framer Motion AnimatedNumber (ADR-032 A2)
- `EmployeeManagement.js` — stacked card deck UI + swipe gesture
- Node.js ยกระดับจาก 20 → 22 LTS, Dockerfile อัพเดทครบ 4 stages

### v0.13.0 — Unified Inbox ✅ RELEASED

| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/components/UnifiedInbox.js` | ✅ done | FB+LINE inbox, pagination, reply bar, right customer card panel |
| `GET /api/inbox/conversations` | ✅ done | enriched: originId, membershipTier, intelligence |
| `GET+POST /api/inbox/conversations/[id]/messages` | ✅ done | paginated GET + POST reply |
| `src/lib/redis.js` | ✅ done | Redis singleton + getOrSet (ADR-034) |
| `src/components/NotificationCenter.js` | ✅ done | Sheets sync + alert rules |

**Bug ที่แก้แล้ว (สำคัญ — อย่าทำซ้ำ):**
> `Customer` model **ไม่มี field `channel`** — ถ้า query `customer: { select: { channel: true } }` จะ throw Prisma error
> ให้ใช้ `conversation.channel` แทนเสมอ

---

## DB Schema — Phase 11 Key Models

```prisma
model Product {
  id          String   @id @default(uuid())
  productId   String   @unique @map("product_id")   // e.g. TVS-PKG01-BUFFET-30H
  name        String
  description String?
  price       Float
  image       String?
  category    String   @default("course")
  duration    Int?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
}

model Order {
  id          String   @id @default(uuid())
  orderId     String   @unique @map("order_id")      // crypto.randomUUID()
  customerId  String   @map("customer_id")
  date        DateTime
  status      String   @default("PENDING")            // PENDING | CLOSED | CANCELLED
  totalAmount Float    @map("total_amount")
  paidAmount  Float    @default(0) @map("paid_amount")
  items       Json     @default("[]")                 // [{productId,name,price,qty}]
  customer    Customer @relation(...)
}

model Customer {
  id             String   @id @default(uuid())
  customerId     String   @unique @map("customer_id")  // TVS-CUS-[CH]-[YY]-[XXXX]
  firstName      String?  @map("first_name")
  lastName       String?  @map("last_name")
  facebookId     String?  @unique @map("facebook_id")
  facebookName   String?  @map("facebook_name")
  lineId         String?  @map("line_id")
  phonePrimary   String?  @map("phone_primary")       // E.164
  membershipTier String   @default("MEMBER") @map("membership_tier")
  // ⚠️ ไม่มี field `channel` — channel อยู่ใน Conversation ไม่ใช่ Customer
}
```

---

## Directory (src/)

```
app/api/
  products/route.js            GET ✅  POST ✅
  products/[id]/route.js       PUT ✅  DELETE ✅ (soft)
  orders/route.js              GET ✅  POST ✅
  orders/[id]/route.js         GET ✅
  analytics/executive/route.js GET ✅  (adsRevenue + storeRevenue)
  customers/route.js           GET ✅ (?search=phone supported)
  inbox/conversations/route.js              ✅ done (v0.13.0)
  inbox/conversations/[id]/messages/route.js ✅ done (v0.13.0)
  notifications/rules/route.js     GET ✅  POST ✅ (v0.14.0)
  notifications/rules/[id]/route.js DELETE ✅     (v0.14.0)
components/
  Sidebar.js                   ✅ icon-only w-20, Lucide (v0.12.0)
  TopBar.js                    ✅ Search + Theme + Lang toggle (v0.12.0)
  EmployeeManagement.js        ✅ stacked card deck + swipe (v0.12.0)
  AuditHistory.js              ✅ connected
  InventoryManager.js          ✅ connected
  PremiumPOS.js                ✅ connected
  ExecutiveAnalytics.js        ✅ Lucide icons + Recharts (v0.12.0 + fix)
  UnifiedInbox.js              ✅ done (v0.13.0)
lib/
  db/index.js                  getPrisma() singleton
  logger.js                    logger.error/info/warn
  notificationEngine.js        ✅ evaluateRules() (v0.14.0)
  queue.js                     ✅ BullMQ notification queue
  redis.js                     ✅ cache singleton (v0.13.0)
workers/
  notificationWorker.mjs       ✅ BullMQ worker — LINE push (v0.14.0)
```
