# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**V School CRM v2** — Greenfield rewrite ของระบบ CRM สำหรับ The V School (โรงเรียนสอนทำอาหารญี่ปุ่น, กรุงเทพฯ)

> ⚠️ นี่คือ v2 เขียนใหม่ทั้งหมด ไม่ใช่ refactor จาก `E:\data_hub`

---

## Version Status (อัพเดท: 2026-03-15)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0` | Auth Stable | ✅ released |
| `v0.10.0` | API Connected | ✅ released |
| `v0.11.0` | Revenue Split | ✅ released |
| `v0.12.0` | UI Enhanced | ✅ released |
| `v0.13.0` | Unified Inbox + Redis Cache | ✅ released |
| `v0.14.0` | NotificationRules + LINE Messaging | ✅ released |
| `v0.15.0` | Asset + Kitchen Ops + Course Enrollment | ✅ released |
| `v0.16.0` | Recipe + Package + Real-time Stock Deduction | ✅ released |
| `v0.18.0` | Production Hardening & API Optimization | ✅ released ← HEAD |
| `v1.0.0` | Production Ready | 🔲 planned |

**Branch:** `master` (งานประจำวัน) · `stable` → ชี้ที่ `v0.12.0`
**รายละเอียด rollback:** `docs/guide/version-control-and-rollback.md`

### v0.13.0 — สิ่งที่ทำแล้ว (Phase 12) ✅
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/components/UnifiedInbox.js` | ✅ done | FB + LINE inbox รวม, pagination, reply, right customer card panel |
| `src/app/api/inbox/conversations/route.js` | ✅ done | enriched customer data: originId, membershipTier, intelligence |
| `src/app/api/inbox/conversations/[id]/messages/route.js` | ✅ done | GET paginated + POST reply |
| `src/components/ExecutiveAnalytics.js` | ✅ done | Lucide icons ครบ, Recharts charts |
| `src/lib/redis.js` | ✅ done | Redis singleton + getOrSet cache pattern (ADR-034) |
| `src/components/NotificationCenter.js` | ✅ done | Google Sheets sync + alert rules |

> ⚠️ **Known Gotcha — Customer model**: ไม่มี field `channel` — ใช้ `conversation.channel` แทน

### v0.14.0 — สิ่งที่ทำแล้ว (Phase 13) ✅ — by Antigravity
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/app/api/notifications/rules/route.js` | ✅ done | GET list + POST create/upsert rules |
| `src/app/api/notifications/rules/[id]/route.js` | ✅ done | DELETE by UUID or ruleId |
| `src/lib/notificationEngine.js` | ✅ done | evaluateRules() — keyword/tier/VIP conditions → BullMQ queue |
| `src/workers/notificationWorker.mjs` | ✅ done | BullMQ worker — LINE push via pushMessage() |
| `src/lib/lineService.js` | ✅ updated | เพิ่ม pushMessage() generic function + quota circuit breaker |
| `src/lib/__tests__/notificationEngine.test.js` | ✅ done | Vitest — 4 test cases |
| `prisma/schema.prisma` → NotificationRule | ✅ done | model + ruleId format NOT-[YYYYMMDD]-[SERIAL] |
| FB+LINE webhooks | ✅ updated | integrated notificationEngine.evaluateRules() |

### v0.15.0 — สิ่งที่ทำแล้ว (Phase 15) ✅ — by Claude + Gemini CLI
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → 9 new models | ✅ done | Enrollment, EnrollmentItem, CourseSchedule, Ingredient, CourseBOM, PurchaseRequest, PurchaseRequestItem, Asset, AssetAssignment |
| `src/lib/repositories/enrollmentRepo.js` | ✅ done | createEnrollment + package expansion, updateHours + cert threshold (30/111/201h) |
| `src/lib/repositories/scheduleRepo.js` | ✅ done | CRUD for CourseSchedule (prisma.courseSchedule) |
| `src/lib/repositories/kitchenRepo.js` | ✅ done | upsertIngredient, upsertBOM, calculateStockNeeded, createPurchaseRequest (PR-YYYYMMDD-SERIAL) |
| `src/lib/repositories/assetRepo.js` | ✅ done | generateAssetId (AST-[CAT3]-[YYYY]-[SERIAL]), CRUD |
| `src/app/api/enrollments/route.js` + `[id]/route.js` | ✅ done | GET+POST / GET+PATCH(hoursToAdd) |
| `src/app/api/schedules/route.js` + `[id]/route.js` | ✅ done | GET(upcoming/days)+POST / GET+PATCH |
| `src/app/api/kitchen/ingredients/route.js` + `[id]/route.js` | ✅ done | GET(lowStockOnly)+POST / PATCH |
| `src/app/api/kitchen/purchase/route.js` + `[id]/route.js` | ✅ done | GET+POST(auto-generate) / PATCH |
| `src/app/api/assets/route.js` + `[id]/route.js` | ✅ done | GET(category/status/search)+POST / GET+PATCH |
| `src/app/api/sheets/sync-master-data/route.js` | ✅ done | POST — CSV sync courses/ingredients/BOM/assets from Google Sheets |
| `src/components/CourseEnrollmentPanel.js` | ✅ done | hours bar, cert badge, expandable items |
| `src/components/KitchenStockPanel.js` | ✅ done | ingredient table, low-stock filter, inline edit |
| `src/components/AssetPanel.js` | ✅ done | asset grid, category/status filter, create+edit modal |
| `src/components/ScheduleCalendar.js` | ✅ done | list/week view, create schedule modal |
| `src/components/PremiumPOS.js` | ✅ upgraded | inline customer creation + enrollment on checkout + success modal |
| `src/components/Sidebar.js` | ✅ updated | OPERATIONS nav group (ตารางคลาส, สต็อกครัว, อุปกรณ์) |
| `src/app/page.js` | ✅ updated | imports + view cases for schedules/kitchen-stock/assets |
| ADR-035, 036, 037 | ✅ done | Remove FB Login / Google Sheets SSOT / Product-as-Course-Catalog |

> ⚠️ **Known Gotcha — Phase 15 DB**: ใช้ `prisma db push` แทน `migrate dev` เพราะ DB drift (facebook_sub column)
> ⚠️ **Known Gotcha — Gemini scheduleRepo**: model name ต้องเป็น `prisma.courseSchedule` ไม่ใช่ `prisma.schedule`
> ⚠️ **Backlog**: Repository pattern violations ใน marketing/inbox routes — flag Phase 17

### v0.16.0 — สิ่งที่ทำแล้ว (Phase 16) ✅ — by Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → Recipe, CourseMenu, RecipeIngredient, RecipeEquipment | ✅ done | สูตรอาหาร + วัตถุดิบ + อุปกรณ์พิเศษ (tracked as stock) |
| `prisma/schema.prisma` → Package, PackageCourse, PackageGift, PackageEnrollment, PackageEnrollmentCourse | ✅ done | แพ็กเกจ + เงื่อนไข swap (1 ครั้ง/enrollment) + ของแถม |
| `prisma/schema.prisma` → Product.hours, Product.sessionType | ✅ done | ชั่วโมงเรียน + ช่วงเวลา (MORNING/AFTERNOON/EVENING) |
| `prisma/schema.prisma` → CourseSchedule.sessionType | ✅ done | ระบุ session เช้า-บ่าย-ค่ำ ต่อ schedule |
| `src/lib/repositories/recipeRepo.js` | ✅ done | CRUD recipes, CourseMenu junction, getMenusByProduct |
| `src/lib/repositories/packageRepo.js` | ✅ done | CRUD packages, createPackageEnrollment, swapCourseInEnrollment (transaction) |
| `src/lib/repositories/scheduleRepo.js` | ✅ updated | เพิ่ม completeSessionWithStockDeduction() — ตัดสต็อกใน prisma.$transaction |
| `src/app/api/recipes/route.js` + `[id]/route.js` | ✅ done | GET+POST / GET+PATCH |
| `src/app/api/packages/route.js` + `[id]/route.js` | ✅ done | GET+POST / GET+PATCH |
| `src/app/api/packages/[id]/swap/route.js` | ✅ done | POST — swap course ใน enrollment (1 ครั้ง, 409 ถ้าใช้แล้ว) |
| `src/app/api/packages/enrollments/route.js` | ✅ done | GET(by customerId)+POST |
| `src/app/api/schedules/[id]/complete/route.js` | ✅ done | POST — complete session + real-time stock deduction |
| `src/components/RecipePage.js` | ✅ done | list สูตร, expand วัตถุดิบ+อุปกรณ์, low-stock badge, add modal |
| `src/components/PackagePage.js` | ✅ done | list แพ็กเกจ, expand courses+gifts+swap groups, add modal (auto-calc originalPrice) |
| `src/components/Sidebar.js` | ✅ updated | เพิ่ม "เมนูสูตร" (BookOpen) + "แพ็กเกจ" (Gift) ใน OPERATIONS group |
| `src/app/page.js` | ✅ updated | imports + view cases for recipes/packages |

> ⚠️ **Known Gotcha — Phase 16 Stock Deduction**: ตัดสต็อกจาก `RecipeIngredient` (qty × studentCount) + `RecipeEquipment` (qtyRequired per session, ไม่คูณนักเรียน)
> ⚠️ **Known Gotcha — Package swap**: `swapUsedAt` ใน PackageEnrollment — ถ้า non-null = ใช้สิทธิ์ไปแล้ว → 409 response
> ⚠️ **Known Gotcha — PackageEnrollment ID format**: PENR-[YYYY]-[SERIAL] (ไม่ใช่ ENR)

### v0.18.0 — สิ่งที่ทำแล้ว (Phase 18) ✅ — by Antigravity
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/app/api/webhooks/facebook/route.js` | ✅ updated | Customer race condition fix (tx try-catch P2002) + env Page IDs |
| `src/app/api/marketing/sync-hourly/route.js` | ✅ updated | Exponential backoff retry (429) + batch processing (batchSize=5) |
| `src/app/api/marketing/chat/conversations/route.js` | ✅ updated | Pagination (limit/cursor) + Null-safe display mapping |
| `src/lib/redis.js` | ✅ updated | JSON.parse safety + _inflight timeout + Negative cache |

> ⚠️ **Known Gotcha — FB Webhook Race**: `findFirst` -> `create` is NOT atomic. ต้องใช้ `try-catch` ครอบ `create` แล้วเช็ค `err.code === 'P2002'` (Prisma unique constraint) เสมอ
> ⚠️ **Known Gotcha — Redis Leaks**: ถ้าใช้ `_inflight` pattern ต้องมี watchdog timeout เสมอ ไม่งั้นถ้า Promise แขวนจะดึง RAM ไปเรื่อยๆ

---

## Source of Truth (ยึดสองไฟล์นี้เหนือสิ่งอื่นใด)

| ไฟล์ | หน้าที่ |
|---|---|
| `system_requirements.yaml` | WHAT to build — Functional & Non-Functional Requirements, API spec |
| `id_standards.yaml` | HOW to name — ID formats, casing conventions, ที่มาของ ID ทุกตัว |

**กฎ:** ถ้า code หรือ reference จาก `E:\data_hub` ขัดแย้งกับ 2 ไฟล์นี้ → ยึดตาม spec เสมอ

---

## Reference (ใช้ได้เมื่อไม่ขัดแย้ง)

- `E:\data_hub\crm-app\` — production codebase เก่า (messy, ใช้เป็น logic reference)
- `E:\crm\docs\adr\` — ADR 001–023 สำหรับเข้าใจ decisions ที่ผ่านมา

---

## Session Start Protocol (บังคับ — ทำทุกครั้งที่เริ่ม session ใหม่)

1. **อ่าน `MEMORY.md`** — ตรวจว่า Antigravity ทำอะไรไปบ้างระหว่างที่ Claude ไม่อยู่
2. **อ่าน `GOAL.md` → Project Status table** — ดู Active Phase + Known Issues
3. ถ้ามีการเปลี่ยนแปลงที่ Claude ไม่เห็นด้วย → บันทึกใน MEMORY.md + แจ้ง Boss
4. ถ้าไม่มีอะไรเปลี่ยน → ข้ามได้ ทำงานต่อปกติ

---

## Conflict Resolution Protocol

เมื่อ Agent ตัดสินใจที่ขัดแย้งกับ architecture:

| ระดับ | ตัวอย่าง | ใครตัดสิน |
|---|---|---|
| **Naming/Style** | ตั้งชื่อ variable ผิด convention | Agent แก้เองได้ |
| **Implementation** | เลือก algorithm ต่างกัน | Claude review แล้วอนุมัติ/แก้ |
| **Architecture** | เพิ่ม model ใหม่, เปลี่ยน DB schema | Claude ตัดสินใจ + เขียน ADR |
| **Breaking Change** | เปลี่ยน API contract, ลบ field | Boss อนุมัติเท่านั้น |

**กฎ:** ถ้า Antigravity ทำ Architecture-level change ไปแล้ว → Claude ต้อง review + เขียน ADR retroactive

---

## Domain Routing (ใช้เลือก context ตาม task)

| Task เกี่ยวกับ | โหลด Skill | ADR หลัก | Key Files |
|---|---|---|---|
| Ad sync, ROAS, campaign | `domain-marketing` | ADR-024 | marketingRepo.js, sync-meta-ads.mjs |
| Chat, webhook, inbox | `domain-inbox` | ADR-028, 033 | UnifiedInbox.js, webhooks/ |
| Customer, order, identity | `domain-customer` | ADR-025, 030 | customerRepo.js, identityService.js |
| DB, Redis, auth, deploy | `domain-infra` | ADR-026, 034 | prisma.ts, redis.js, middleware.js |

---

## Architecture Decisions ใหม่ (v2)

| ADR | Decision |
|---|---|
| ADR-024 | Marketing Intelligence: Bottom-Up Aggregation, Checksum, Hourly Ledger |
| ADR-025 | Identity Resolution: Phone E.164, Cross-platform Merge, LINE Attribution |
| ADR-026 | RBAC: 6-tier role hierarchy, server-side guard |
| ADR-027 | DB Schema Init: 23 models, UUID PKs, named relations |
| ADR-028 | Facebook Messaging: Webhook < 200ms, fire-and-forget, prisma.$transaction |
| ADR-029 | Employee Registry: Auto-generate TVS-EMP ID, JSONB identities, bcrypt |
| ADR-030 | Revenue Channel Split: conversationId → Ads vs Store classification |
| ADR-031 | Icon-Only Sidebar: w-20, Lucide migration ออกจาก FontAwesome CDN |
| ADR-032 | UI Enhancement (A): Recharts charts, Framer Motion animations |
| ADR-035 | Remove Facebook Login: CredentialsOnly auth (FB hides admin PSID) |
| ADR-036 | Google Sheets as SSOT: master data sync via CSV URL, 4 env vars |
| ADR-037 | Product-as-Course-Catalog: reuse Product model, certLevel 30/111/201h |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Redis + BullMQ |
| AI | Google Gemini |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |

---

## Naming Conventions (จาก `id_standards.yaml`)

| Context | Convention | ตัวอย่าง |
|---|---|---|
| DB columns / Prisma `@map` | `snake_case` | `customer_id`, `fb_thread_id` |
| JS/TS application code | `camelCase` | `customerId`, `fbThreadId` |
| React Components | `PascalCase` | `CustomerList`, `FacebookChat` |
| Env vars | `SCREAMING_SNAKE` | `FB_PAGE_ACCESS_TOKEN` |
| CSS | Tailwind utility classes | — |

**ห้ามใช้ `snake_case` ใน JS/TS layer เด็ดขาด**

---

## Key ID Formats (จาก `id_standards.yaml`)

```
Customer    : TVS-CUS-[CH]-[YY]-[XXXX]     e.g. TVS-CUS-FB-26-0123
Member      : MEM-[YY][AGENT][INTENT]-[NO] e.g. MEM-26BKKP-0001
Agent Code  : AGT-[TYPE]-[YEAR]-[SERIAL]   e.g. AGT-H-26-003
Task        : TSK-[YYYYMMDD]-[SERIAL]      e.g. TSK-20260308-001
Conversation: t_{15_digit_uid}             e.g. t_10163799966326505
Message     : mid.$c... หรือ m_...
Trace/Sync  : SYNC-[TYPE]-[YYYYMMDD]-[RND] e.g. SYNC-ADS-20260308-A92B
```

---

## Non-Functional Requirements (ห้ามละเมิด)

- **NFR1** — Webhook ตอบ Facebook < 200ms เสมอ
- **NFR2** — Dashboard API < 500ms (ใช้ local JSON cache)
- **NFR3** — BullMQ retry ≥ 5 ครั้ง, exponential backoff
- **NFR5** — Identity upsert ต้องอยู่ใน `prisma.$transaction`

---

## Error Handling Rules

- **ห้าม** `catch(e) {}` เงียบ — ต้อง log ทุกครั้ง
- Format: `console.error('[ModuleName] message', error)`
- API routes: `NextResponse.json({ error }, { status })`
- Workers: `throw error` เพื่อให้ BullMQ retry

---

## Database Access Pattern

- ทุก DB operation ต้องผ่าน repository layer (`src/lib/repositories/`)
- ห้ามเรียก Prisma โดยตรงจาก API route หรือ Component
- Cache operations ผ่าน `src/lib/cache/cacheSync.js` เท่านั้น
- File I/O ใช้ `fs.promises` เสมอ — ห้าม `readFileSync/writeFileSync`

---

---

## Role & Hierarchy

1. **Claude (Lead Architect)**: กำหนดทิศทางภาพรวม, อนุมัติ ADRs, และตัดสินใจเรื่อง Architecture หลัก
2. **Antigravity (Senior Agent)**: รับแผนจาก Claude, วางแผนละเอียด (Task Breakdown), และดำเนินการแบบ End-to-End (Context ใน `ANTIGRAVITY.md`)
3. **Gemini CLI (Sub-agent)**: รับหน้าที่ Implement เฉพาะจุด, เขียน Unit Test หรือ Boilerplate (Context ใน `GEMINI.md`)

---

## Sub-agent Protocol (Gemini CLI)

```bash
# รันจาก /Users/ideab/Desktop/crm เสมอ เพื่อให้ GEMINI.md โหลด context อัตโนมัติ
cd /Users/ideab/Desktop/crm
echo "INTERFACE_SPEC" | gemini -p "implement, code only" -o text
```

- ส่งเฉพาะ **function signature / interface** ไม่ส่งโค้ดทั้งไฟล์
- Gemini: boilerplate, helpers, unit tests
- Claude: architectural decisions, integration logic, security, QA

---

## Auto-Update Protocol (บังคับ — ทำทุกครั้งหลังเสร็จงาน)

หลังทำงานชิ้นใหญ่ หรือ commit สำเร็จ Claude **ต้องอัปเดต** ไฟล์เหล่านี้โดยไม่ต้องรอให้สั่ง:

| ไฟล์ | เมื่อไหร่ต้องอัปเดต |
|---|---|
| `CLAUDE.md` | เมื่อ version status เปลี่ยน, phase เสร็จ, หรือมี Known Gotcha ใหม่ |
| `GEMINI.md` | เมื่อ phase เปลี่ยน (DONE/CURRENT/PLANNED), DB schema เพิ่มฟิลด์, หรือ API routes ใหม่ |
| `GOAL.md` | เมื่อ task ใน phase เสร็จ → tick ✅, หรือ phase ใหม่เริ่ม |
| `CHANGELOG.md` | เมื่อทำ commit ที่มีนัยสำคัญ (feature, fix, breaking change) |

### กฎ
1. หลัง commit ทุกครั้ง → ตรวจ CLAUDE.md version table ว่าตรงไหม
2. เมื่อ phase เสร็จ → อัปเดต GOAL.md table + เพิ่ม detail section
3. ถ้า API route ใหม่ → เพิ่มใน GEMINI.md Directory section
4. Known Gotcha ใหม่ → เพิ่มใน CLAUDE.md ทันที

---

## Development Commands

```bash
cd /Users/ideab/Desktop/crm
docker compose up -d       # PostgreSQL (port 5433) + Redis
npx prisma generate
npx prisma migrate dev
npm run dev                 # http://localhost:3000
npm run worker              # BullMQ worker (terminal แยก)
```

**Node.js:** v22 LTS (Iron) — ดู `.nvmrc`

---

## Docs Structure

```
E:\crm\
  system_requirements.yaml   ← spec หลัก
  id_standards.yaml          ← naming หลัก
  CLAUDE.md                  ← this file
  ANTIGRAVITY.md             ← Senior Agent context
  GEMINI.md                  ← Gemini sub-agent context
  CHANGELOG.md               ← version history
  architect_plan.md          ← implementation roadmap (7 phases)
  prisma/schema.prisma       ← database schema
  docs/
    adr/                     ← Architecture Decision Records
    architecture/            ← arc42 + C4 diagrams
    database_erd.md          ← ERD (Mermaid)
  automation/                ← Playwright scripts
  crm-app/                   ← Next.js app (build here)
```
