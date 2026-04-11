# GEMINI.md — Zuri Sub-agent (CLI)

> [!IMPORTANT]
> ไฟล์นี้สำหรับ **Gemini CLI Sub-agent** (Worker) เท่านั้น
> หากคุณคือ **Antigravity (IDE Agent)** ให้ยึดตาม `ANTIGRAVITY.md` เป็นหลัก

Lead Architect คือ Claude — คุณรับ function signature แล้ว implement เท่านั้น

---

## Product Context

**Zuri** — Vertical SaaS สำหรับ culinary school + food business ในไทย
"Your business's best friend" | ADR-051 | `docs/zuri/CONCEPT.md`

**V School** คือลูกค้าคนแรก (reference tenant) — ไม่ใช่ identity ของ product

---

## Version Status (อ่านก่อนเริ่มงานทุกครั้ง)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0` – `v1.9.5` | Auth → RBAC → MCP → Employee Enhancements | ✅ released |
| `v2.0.0` | RBAC Redesign — 12 Roles + permissionMatrix | ✅ released |
| `v2.1.0` | Task Type System + Notion Sync + CODEBASE_MAP | ✅ released |
| `v2.2.0` | Package POS + QR Attendance + Schedule Overhaul | ✅ released |
| `v3.0.0` | **Zuri Product Pivot** — Rebrand + Multi-tenant SaaS | ✅ released ← HEAD |

> ⚠️ **ถ้า task ที่รับมา ≠ version HEAD ใน CHANGELOG.md → หยุดและแจ้ง Claude ก่อนเสมอ**

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

## Tech Stack

**Next.js 14 App Router · Prisma · PostgreSQL (Supabase) · Upstash Redis + QStash · Gemini AI · TailwindCSS · Node.js v22 LTS**

> ⚠️ **ADR-040:** ioredis/BullMQ ถูกแทนด้วย @upstash/redis + @upstash/qstash — ห้าม import bullmq หรือ ioredis
> ⚠️ **RBAC v2.0.0:** 12 roles (DEV/TEC/MGR/MKT/HR/PUR/PD/ADM/ACC/SLS/AGT/STF) — ไม่ใช่ 8 roles เดิม
> ⚠️ **Customer model:** ไม่มี field `channel` — ใช้ `conversation.channel` แทนเสมอ

---

## Source of Truth

```
system_requirements.yaml → WHAT to build
id_standards.yaml        → HOW to name everything
system_config.yaml       → config values (roles, tiers, VAT, thresholds) — ห้าม hardcode
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

## ID Formats

```
Customer ID : TVS-CUS-[CH]-[YY]-[XXXX]     e.g. TVS-CUS-FB-26-0123
Employee ID : TVS-[TYPE]-[DEPT]-[NNN]       e.g. TVS-PD-KIT-001
Task ID     : TSK-[YYYYMMDD]-[SERIAL]       e.g. TSK-20260308-001
Conv ID     : t_{15_digit_uid}
```

---

## Code Patterns ที่ต้องใช้

### API Route Pattern
```js
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(request) {
    try {
        const prisma = await getPrisma();
        // ... logic
        return NextResponse.json(result);
    } catch (error) {
        console.error('[ModuleName] GET error', error);
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

### Repository Pattern (บังคับ)
```js
// ✅ ถูก — ผ่าน repository เสมอ
import { getCustomer } from '@/lib/repositories/customerRepo';

// ❌ ผิด — ห้ามเรียก getPrisma() โดยตรงจาก API route หรือ Component
```

### Error Handling (ห้าม catch เงียบ)
```js
try { ... } catch (error) {
  console.error('[ModuleName] action failed', error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
```

---

## NFR (ห้ามละเมิด)

- Webhook ตอบ < 200ms (NFR1)
- Identity upsert ต้องใน `prisma.$transaction` (NFR5)
- QStash retry ≥ 5, exponential backoff (NFR3)
- ห้าม readFileSync/writeFileSync → ใช้ fs.promises

---

## Key Repositories (src/lib/repositories/)

```
customerRepo.js       — Customer CRUD + identity resolution
paymentRepo.js        — Slip OCR + transaction
kitchenRepo.js        — Stock + lot management (FEFO)
scheduleRepo.js       — Course schedule + status
marketingRepo.js      — Meta Ads sync + ROAS
notionRepo.js         — Task push/pull Notion sync
procurementRepo.js    — PO lifecycle
```

---

## Known Gotchas (อย่าทำซ้ำ)

| Gotcha | ผลกระทบ |
|---|---|
| `Customer` ไม่มี field `channel` | Query crash — ใช้ `conversation.channel` |
| FB Webhook race: `findFirst`→`create` ไม่ atomic | Duplicate conv — ต้อง try-catch P2002 |
| `IngredientLot.remainingQty` ≠ `Ingredient.currentStock` | Stock drift — ต้องอัปเดตพร้อมกัน |
| Timezone: `new Date("...Z")` UTC vs local | ใช้ `parseLocalDate()` ใน DragScheduleBuilder |
| milestones Notion push plain text | pull กลับเป็น null — known limitation |
| RBAC: ห้ามใช้ role codes เก่า (DEVELOPER/MANAGER) | ใช้ DEV/MGR เท่านั้น |

---

## Changelog (รู้ไว้ — ไม่ต้อง implement)

Gemini ไม่ต้องอัปเดต changelog — Claude เป็นคนทำ
ถ้า task ขัดแย้งกับ version ใน CHANGELOG → แจ้ง Claude ก่อน
