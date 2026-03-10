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
Phase 1-10: [DONE] Foundation → Identity → RBAC → FB Messaging → Member Self-Reg
Phase 11:   [CURRENT] UI Component Wiring — connect 7 new UI modules to real APIs
Phase 12:   [PLANNED] NotificationRules API + LINE Messaging integration
```

---

## Phase 11 — Task Map

### APIs ที่ต้องสร้างใหม่

| Task | File | Exports |
|---|---|---|
| B1 | `src/app/api/products/route.js` | เพิ่ม `POST` (create product) |
| B1 | `src/app/api/products/[id]/route.js` | `PUT` (update), `DELETE` (soft-delete: isActive=false) |
| B2 | `src/app/api/analytics/executive/route.js` | `GET` → { totalRevenue, ordersCount, avgTicket, activeSessions, conversionRate, revenueChange } |

### Components ที่ต้อง wire

| Task | File | ลบ mock | ต่อ API |
|---|---|---|---|
| A1 | `src/components/AuditHistory.js` | MOCK_ORDERS | GET /api/orders |
| A2 | `src/components/InventoryManager.js` | INITIAL_PRODUCTS | GET/POST/PUT/DELETE /api/products |
| A3 | `src/components/PremiumPOS.js` | MOCK_PRODUCTS | GET /api/products + customer lookup + POST /api/orders |
| A4 | `src/components/ExecutiveAnalytics.js` | hardcoded stats | GET /api/analytics/executive |

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
  products/route.js           GET ✅  POST ❌→Task B1
  products/[id]/route.js      PUT ❌  DELETE ❌→Task B1
  orders/route.js             GET ✅  POST ✅
  orders/[id]/route.js        GET ✅
  analytics/executive/route.js ❌→Task B2
  customers/route.js          GET ✅ (?search=phone supported)
components/
  AuditHistory.js             🔴→Task A1
  InventoryManager.js         🔴→Task A2
  PremiumPOS.js               🔴→Task A3
  ExecutiveAnalytics.js       🔴→Task A4
lib/
  db/index.js                 getPrisma() singleton
  logger.js                   logger.error/info/warn
```
