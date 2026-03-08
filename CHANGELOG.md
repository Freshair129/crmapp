# Changelog — V School CRM v2

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Phase 7 — RBAC (2026-03-08)

- **`src/lib/rbac.js`**: `ROLE_HIERARCHY`, `hasPermission(userRole, minRole)`, `getRoleLevel()` — 6-tier: DEVELOPER(5) > MANAGER(4) > SUPERVISOR(3) > ADMIN(2) > AGENT(1) > GUEST(0)
- **`src/lib/authGuard.js`**: `requireRole(minRole, handler)` — HOF wrapper สำหรับ Next.js App Router, `getSessionRole()` helper
- **`src/middleware.js`**: Next.js middleware ตรวจ JWT ทุก `/api/*` request, enforce route matrix ก่อนถึง handler

Route matrix (ADR-026 D4):
| Route | Min Role |
|---|---|
| `/api/webhooks/*` | skip (signature auth) |
| `/api/employees/*` | MANAGER |
| `/api/marketing/*` | SUPERVISOR |
| `/api/analytics/*` | SUPERVISOR |
| `/api/customers/*` | AGENT |
| `/api/*` (catch-all) | AGENT |

### Phase 6 — Identity Resolution (2026-03-08)

- **`src/lib/identityService.js`**: `resolveOrCreateCustomer({ psid, lineId, phone, channel, name })` — lookup by PSID/lineId/phone (OR), merge missing fields, สร้างใหม่ถ้าไม่พบ, ทุก op ใน `prisma.$transaction` (ADR-025)
- **`src/lib/lineService.js`**: refactor ให้ใช้ `resolveOrCreateCustomer` แทน custom lookup — ลด duplication, consistent cross-channel
- **6.1 phoneUtils.js**: ทำแล้วใน Phase 2 ✅
- **Fixes**: `await getPrisma()`, semicolons, null coalescing

### Phase 5 — Marketing Intelligence Pipeline (2026-03-08)

- **`src/services/marketingAggregator.js`**: `aggregateHierarchy(syncDate)` — Bottom-Up: Ads → groupBy adSetId → sum → map campaignId → sum (ADR-024 D2)
- **`src/services/checksumVerifier.js`**: `verifyChecksum(campaignId, tolerance=0.01)` — เปรียบ Sum(Ads.spend) vs Campaign.rawData.spend จาก Meta, log warn ถ้า delta > 1% (ADR-024 D3)
- **`src/services/hourlyLedger.js`**: `appendLedgerIfChanged(adId, hourDate, current)` — append-only AdHourlyLedger, delta rule: skip ถ้าไม่มีการเปลี่ยนแปลง (ADR-024 D4)
- **`src/utils/marketingMetrics.js`**: `calcCON/calcCPA/calcROAS` — pure functions, คำนวณ on-the-fly ไม่เก็บ DB (ADR-024 D5)
- **Schema 5.3**: `AdHourlyLedger` model สร้างแล้วใน Phase 1 ✅
- **Fixes**: เพิ่ม `await` หน้า `getPrisma()`, แก้ default→named import `{ getPrisma }`

### Phase 4 — Structured Logging (2026-03-08)

- **`src/lib/logger.js`**: Zero-dependency structured logger — `logger.info/warn/error(module, message, error?, meta?)`
  - Production: one-line JSON `{ timestamp, level, module, message, ...meta }`
  - Development: colorized pretty-print พร้อม error stack
- **Replace**: `console.log/warn/error` ทุกจุดใน `src/` → `logger.*` ครบ 0 console เหลือ
- **Note**: Gemini CLI stdin+flag conflict — Claude เขียน logger.js โดยตรง

### Phase 3 — Creative Fatigue Alerts (2026-03-08)

- **`src/services/fatigueDetector.js`**: `detectCreativeFatigue(thresholdDays, minSpend)` — query Active ads อายุ > N วัน + spend > threshold, sort by ageDays DESC
- **`src/instrumentation.js`**: Next.js instrumentation hook — cron `0 9 * * *` (09:00 BKK) ตรวจ creative fatigue แล้ว push LINE alert ถ้าพบ
- **Fix**: เพิ่ม `await` หน้า `getPrisma()` และ `.getTime()` บน `createdAt` ที่ Gemini ลืม

### Phase 2 — LINE Attribution Gap / ROAS Fix (2026-03-08)

- **`src/utils/phoneUtils.js`**: `normalizePhone()` — แปลงเบอร์ไทยทุกรูปแบบเป็น E.164 (`+66...`) ไม่ใช้ external library
- **`src/lib/lineService.js`**: `recordLineConversion()` — ค้นหา Customer ด้วย lineId/phone, ดึง `originId` (ad_id) เพื่อทำ attribution, สร้าง Customer ใหม่ถ้าไม่พบ, ใช้ `prisma.$transaction`
- **`src/app/api/webhooks/line/route.js`**: LINE Webhook endpoint — ตรวจ HMAC-SHA256 signature, ตอบ 200 ทันที, fire-and-forget `processEvents()` เพื่อ attribution
- **Fix**: `recordLineConversion` สร้าง `customerId` ในรูปแบบ `TVS-CUS-LN-{YY}-{SERIAL}` แก้ required field ที่ Gemini ลืม

### Phase 1 — Prisma Schema Initialization (2026-03-08)

- **`prisma/schema.prisma`**: สร้าง schema ครบ 23 models — Customer, Order, Transaction, InventoryItem, TimelineEvent, Conversation, Message, ChatEpisode, Employee, Product, CartItem, Campaign, AdAccount, AdSet, Ad, AdLiveStatus, AdCreative, Experiment, AdDailyMetric, AdHourlyMetric, AdHourlyLedger, Task, AuditLog
- **UUID**: ใช้ `@default(uuid())` บน PK ทุก model (แทน CUID) ตาม id_standards
- **Customer.originId**: เพิ่ม `origin_id` field สำหรับ Source Attribution และ LINE ROAS fix (ADR-025)
- **AdHourlyLedger**: เพิ่ม model append-only hourly trend ledger (ADR-024 D4)
- **Campaign (Bottom-Up)**: ลบ `spend/impressions/clicks/revenue/roas` ออกจาก Campaign — คำนวณใน app layer (ADR-024 D2)
- **Employee.role**: `@default("AGENT")` — ค่า RBAC ที่ปลอดภัยที่สุด (ADR-026 D5)
- **Product.linkedMenuIds**: เพิ่ม `linked_menu_ids String[]` + fallback fields (id_standards COURSE-TO-MENU)
- **Conversation.isStarred**: เพิ่ม `is_starred Boolean @default(false)`
- **Named Relations**: `OrderCloser`, `ConversationAssignee`, `MessageResponder`, `OrderConversation`, `AgentTasks`
- **ADR-027**: บันทึก decisions ทั้งหมดของ schema initialization

### Planning (2026-03-08)

- **Project Init**: กำหนด `E:\crm` เป็น workspace ของ CRM v2 — Greenfield rewrite
- **Source of Truth**: ยึด `system_requirements.yaml` + `id_standards.yaml` เป็นหลัก ใช้ `E:\data_hub` เป็น reference เท่านั้น
- **CLAUDE.md**: สร้าง context file สำหรับ Claude Code
- **GEMINI.md**: สร้าง context file สำหรับ Gemini CLI sub-agent
- **architect_plan.md**: Roadmap 7 phases พร้อม sub-agent delegation strategy
- **docs/database_erd.md**: ERD ครบ 22 tables + planned changes (Mermaid)
- **ADR-024**: Marketing Intelligence Pipeline — Bottom-Up Aggregation, Checksum, Hourly Ledger
- **ADR-025**: Cross-Platform Identity Resolution — Phone E.164, Identity Merge, LINE Attribution
- **ADR-026**: Role-Based Access Control — 6-tier hierarchy, API guard middleware
