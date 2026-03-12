# GEMINI.md — V School CRM v2

คุณคือ **Agent** ในทีม V School CRM v2
Lead Architect คือ Claude — คุณรับ function signature แล้ว implement เท่านั้น

---

## 🏷️ Version Status (อ่านก่อนเริ่มงานทุกครั้ง)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0` | Auth Stable | ✅ released |
| `v0.10.0` | API Connected | ✅ released |
| `v0.11.0` | Revenue Split | ✅ released |
| `v0.12.0` | UI Enhanced | ✅ **stable / current** ← ตอนนี้อยู่ที่นี่ |
| `v0.13.0` | Unified Inbox | 🔲 **งานถัดไป** (Phase 12) |
| `v1.0.0` | Production Ready | 🔲 planned |

**branch `master`** = งานประจำวัน · **branch `stable`** = ชี้ที่ v0.12.0
เมื่อ Phase 12 เสร็จ → Claude จะ tag `v0.13.0` และเลื่อน stable

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
Phase 1-10: [DONE]    Foundation → Identity → RBAC → FB Messaging → Member Self-Reg
Phase 11:   [DONE]    UI Component Wiring — APIs + components connected to real data
                      → tagged v0.12.0 (includes Sidebar, TopBar, Charts, Animations)
Phase 12:   [CURRENT] Unified Inbox — รวม FB + LINE inbox (→ v0.13.0 เมื่อเสร็จ)
Phase 13:   [PLANNED] NotificationRules API + LINE Messaging integration (→ v0.14.0)
```

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

## Phase 12 — CURRENT

### v0.12.0 — เสร็จแล้วทั้งหมด ✅ (tagged 2026-03-13)
- `Sidebar.js` — icon-only `w-20`, Lucide React, tooltip on hover (ADR-031)
- `TopBar.js` — Global Search, Language, Theme toggle (Lucide icons)
- `ExecutiveAnalytics.js` — Recharts AreaChart + BarChart (ADR-032 A1)
- `Dashboard.js` — Framer Motion AnimatedNumber (ADR-032 A2)
- `EmployeeManagement.js` — stacked card deck UI + swipe gesture
- Node.js ยกระดับจาก 20 → 22 LTS, Dockerfile อัพเดทครบ 4 stages

### Next Task: Unified Inbox
รวม Facebook Chat + LINE Connect เป็น inbox เดียว พร้อม filter tab

**Interface ที่ต้อง implement:**
```
GET /api/inbox/conversations?channel=ALL|FACEBOOK|LINE&status=open|closed&search=
GET /api/inbox/conversations/[id]/messages
POST /api/inbox/conversations/[id]/messages  { text }
```

**Component:**
```
src/components/UnifiedInbox.js
  ├ ConversationList  (แสดง channel badge: 🔵FB / 🟢LINE)
  ├ FilterBar         ([ทั้งหมด] [Facebook] [LINE])
  └ MessageThread     (bubble UI เหมือนเดิม)
```

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
  id         String  @id @default(uuid())
  customerId String  @unique @map("customer_id")     // TVS-CUS-[CH]-[YY]-[XXXX]
  firstName  String  @map("first_name")
  lastName   String? @map("last_name")
  phone      String?
  channel    String  @default("WALK_IN")
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
  inbox/conversations/route.js ❌ → Phase 12
  inbox/conversations/[id]/messages/route.js ❌ → Phase 12
components/
  Sidebar.js                   ✅ icon-only w-20, Lucide (v0.12.0)
  TopBar.js                    ✅ Search + Theme + Lang toggle (v0.12.0)
  EmployeeManagement.js        ✅ stacked card deck + swipe (v0.12.0)
  AuditHistory.js              ✅ connected
  InventoryManager.js          ✅ connected
  PremiumPOS.js                ✅ connected
  ExecutiveAnalytics.js        ✅ connected (Total/Ads/Store tabs)
  UnifiedInbox.js              ❌ → Phase 12
lib/
  db/index.js                  getPrisma() singleton
  logger.js                    logger.error/info/warn
```
