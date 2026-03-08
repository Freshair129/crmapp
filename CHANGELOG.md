# Changelog — V School CRM v2

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.4.0] — 2026-03-09

### Facebook Messaging Integration (ADR-028)

- **`src/app/api/webhooks/facebook/route.js`**: GET verify-token + POST webhook — ตอบ 200ms ทันที, fire-and-forget `processEvent()`. Upsert Customer by PSID, Upsert Conversation (increment `unreadCount`), Upsert Message with `attachments` + `adReferral` metadata — ทุก op ใน `prisma.$transaction` (NFR1 + NFR5 compliant)
- **`scripts/sync-fb-messages.mjs`**: Graph API polling script — ดึงประวัติสนทนาย้อนหลัง 90 วัน. Paginated conversations + messages, `ON CONFLICT (message_id) DO NOTHING` (idempotent)
- **`src/app/api/marketing/chat/message-sender/route.js`**: Attribution endpoint สำหรับ sync_agents_v2.js — match ชื่อ "ส่งโดย" → Employee ด้วย priority: `identities.facebook.name` (JSONB) > nickName > firstName/lastName. อัปเดต `messages.responder_id`

### Employee Registry (ADR-029)

- **`src/app/api/employees/route.js`** (updated): POST สร้าง employee ใหม่ — auto-generate `TVS-[DEPT]-[SERIAL]`, bcrypt password (salt=12), บันทึก `facebookName` ใน `identities.facebook.name` JSONB. GET รองรับ `?status=` filter + ส่ง `identities` กลับ
- **`src/app/api/employees/[id]/route.js`** (new): PATCH update fields + password + facebookName (deep merge JSONB). DELETE soft-delete (status → INACTIVE)
- **`src/app/settings/employees/page.js`** (new): Employee management UI — table + modal form. Fields: firstName, lastName, nickName, facebookName, email, phone, department, role, password. Role badge, activate/deactivate
- **`prisma/schema.prisma`**: เพิ่ม `creativeId String? @unique @map("creative_id")` ใน `AdCreative` model

### Member Self-Registration

- **`src/app/api/members/register/route.js`** (new): Public POST endpoint (ไม่ต้อง auth). Generate `MEM-[YY]TVS[INTENT]-[SERIAL]`, duplicate check by `phonePrimary` (409 ถ้าซ้ำ), เก็บ interest + source ใน `intelligence` JSONB
- **`src/app/register/page.js`** (new): Branded public registration form — gradient red→orange. Fields: ชื่อ, นามสกุล, ชื่อเล่น, เบอร์โทร, อีเมล, LINE ID, interest (radio cards: Pro/Business/Hobby). Success state แสดง memberId
- **`src/middleware.js`**: เพิ่ม `{ prefix: '/api/members/register', role: null }` — whitelist เป็น public route

### Meta Ads Sync — Batch Optimization & Bug Fixes

- **`scripts/sync-meta-ads.mjs`**: Rewrote insights fetching ให้ใช้ **Meta Batch API** (50 ads/request) — ลด API calls จาก 1726 sequential เหลือ ~35 batch calls. Pre-loaded `adsetMap` + `creativeMap` เป็น `Map` เพื่อกำจัด per-ad DB round trips
- เพิ่ม **Ad Creatives sync** (Section 3) — `ON CONFLICT (creative_id) DO UPDATE`
- เพิ่ม `--insights-only` flag + `syncInsightsOnly()` — อัปเดต spend/impressions/clicks/revenue บน existing ads
- เพิ่ม `BATCH_SIZE = 50` + `BATCH_DELAY = 2000ms` (module-level constants)
- Fix: Meta Batch API body ต้องเป็น `URLSearchParams` (form-urlencoded) ไม่ใช่ JSON
- Fix: URL ต้องมี version `${GRAPH_API}/` = `https://graph.facebook.com/v19.0/` ไม่ใช่ unversioned
- Fix: Rate limit retry — exponential backoff 60s/120s/180s ใน `graphGet()`
- Result: 213 campaigns / 788 adsets / 6718 creatives / 1726 ads synced ✅

### Initial GitHub Commit

- Git repository initialized at `E:\crm`
- Initial commit pushed to `https://github.com/Freshair129/crmapp`

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
