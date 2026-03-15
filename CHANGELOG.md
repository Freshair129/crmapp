# Changelog — V School CRM v2

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [v0.18.0] — 2026-03-16

### Phase 18 — Production Hardening & API Optimization (by Antigravity)

#### Infrastructure & Reliability
- **`src/app/api/webhooks/facebook/route.js`**: Fixed race condition in Customer creation using atomic `try-catch` with Prisma `P2002` (Unique constraint) recovery. Moved hardcoded Page IDs to `KNOWN_PAGE_IDS` env-based array.
- **`src/lib/redis.js`**: Improved safety with `JSON.parse` wrappers (auto-delete corrupted keys). Added 30s `_inflight` watchdog timeout to prevent memory leaks on hung promises. Implemented negative caching (30s) for failed fetchers.

#### Performance & Scaling
- **`src/app/api/marketing/sync-hourly/route.js`**: Added exponential backoff retry (1s, 2s, 4s) for Graph API 429 errors. Implemented concurrency batching (`BATCH_SIZE = 5`) for ad insights to speed up sync while respecting limits.
- **`src/app/api/marketing/chat/conversations/route.js`**: Added cursor-based pagination (`limit`, `cursor`). Optimized database load by restricting messages include to `take: 1`.

#### Null Safety & UX
- **Chat Conversations**: Implemented null-safe Display Name mapping (firstName > facebookName > participantId) and safe message snippet slicing to prevent 500 errors on incomplete data.
- **Token Expiry**: Added proactive detection of `OAuthException` (code 190) in hourly sync, returning 401 early to prompt env-var renewal.

## [v0.16.0] — 2026-03-15

### Phase 16 — Recipe + Package + Real-time Stock Deduction

#### 16a — Schema (prisma db push) ✅
- `prisma/schema.prisma`: 9 new models — Recipe, CourseMenu, RecipeIngredient, RecipeEquipment, Package, PackageCourse, PackageGift, PackageEnrollment, PackageEnrollmentCourse
- `Product`: + `hours Float?` (ชั่วโมงเรียน), + `sessionType String?` (MORNING|AFTERNOON|EVENING)
- `CourseSchedule`: + `sessionType String?`
- Back-relations added to Customer, Employee, Product, Ingredient

#### 16b — Repository Layer ✅
- `recipeRepo.js` (new): CRUD recipes, `addCourseMenu/removeCourseMenu`, `getMenusByProduct` — supports nested ingredient + equipment creation
- `packageRepo.js` (new): CRUD packages + gifts + courses, `createPackageEnrollment`, `swapCourseInEnrollment` (atomic `$transaction`, enforces 1-swap-per-enrollment rule)
- `scheduleRepo.js` (updated): + `completeSessionWithStockDeduction(id, studentCount)` — Prisma `$transaction` deducts `Ingredient.currentStock` (qty × studentCount) + `RecipeEquipment.currentStock` (per session)

#### 16c — API Routes ✅
- `GET|POST /api/recipes` — list + create recipes
- `GET|PATCH /api/recipes/[id]` — detail + update
- `GET|POST /api/packages` — list + create packages
- `GET|PATCH /api/packages/[id]` — detail + update
- `POST /api/packages/[id]/swap` — one-time course swap (409 if already used)
- `GET|POST /api/packages/enrollments` — list by customer + create enrollment
- `POST /api/schedules/[id]/complete` — complete session + real-time stock deduction

#### 16d — UI ✅
- `RecipePage.js` (new): expandable recipe cards, low-stock badges, add modal with ingredient/equipment builder
- `PackagePage.js` (new): expandable package cards, swap group display, discount calculation, add modal with auto-calculate originalPrice
- `Sidebar.js`: OPERATIONS group + BookOpen (เมนูสูตร) + Gift (แพ็กเกจ)

#### 16e — Docs ✅
- `docs/API_REFERENCE.md`: sections 17–19 (Recipes, Packages, Schedule Complete)
- `docs/database_erd.md`: Phase 16 domain added
- `docs/adr/038-recipe-package-stock-deduction.md` (new ADR)
- `docs/guide/VALIDATOR.md` (new): QA checklist + manual validation procedures

---

## [v0.15.0] — 2026-03-15

### Phase 15 — Asset + Kitchen Ops + Course Enrollment

#### 15a — Schema ✅
- `prisma/schema.prisma`: 9 new models — Enrollment, EnrollmentItem, CourseSchedule, ClassAttendance, Ingredient, CourseBOM, PurchaseRequest, PurchaseRequestItem, Asset
- Back-relations added to Customer, Product, Employee models
- DB synced via `prisma db push` to Supabase

#### 15b — Repository Layer ✅
- `enrollmentRepo.js`: createEnrollment (package expand), hours tracking, certLevel thresholds 30h/111h/201h
- `scheduleRepo.js`: CRUD + upcoming schedules filter
- `kitchenRepo.js`: stock mgmt, BOM, calculateStockNeeded, auto PurchaseRequest
- `assetRepo.js`: CRUD + AST-[CAT]-[YYYY]-[SERIAL] ID generation

#### 15c — API Routes ✅
- 10 routes: enrollments, schedules, kitchen/ingredients, kitchen/purchase, assets (GET/POST/PATCH)

#### Tooling
- `.claude/skills/plan-phase.md`: workflow skill สำหรับ ADR + implement plan + version control ก่อน implement ทุก phase

#### 15d/15e — Planned
- UI Components: CourseEnrollmentPanel, KitchenStockPanel, AssetPanel, ScheduleCalendar
- POS upgrade: inline customer create + Enrollment on checkout
- Google Sheets sync (4 tabs), Excel export

### Auth Cleanup (2026-03-15)
- **`src/app/api/auth/[...nextauth]/route.js`**: ลบ FacebookProvider ออก — Facebook ซ่อน admin PSID ทำให้ attribution ไม่ทำงานจริง. Login เหลือแค่ email+password
- **`docs/incidents/2026-03-15-context-loss-bugs.md`** (new): Post-mortem — context loss bugs จาก Antigravity unsupervised session
- **`scripts/check-adr.sh`**: Fix cache TTL guard ให้ตรวจเฉพาะ JS/TS files

---

## [Unreleased] — 2026-03-14

### Phase 13 — NotificationRules + LINE Messaging (by Antigravity)

#### Notification Rules Engine
- **`src/app/api/notifications/rules/route.js`** (new): GET list + POST create/upsert rules — auto-generate `NOT-[YYYYMMDD]-[SERIAL]` ruleId
- **`src/app/api/notifications/rules/[id]/route.js`** (new): DELETE by UUID or ruleId (dual lookup)
- **`src/lib/notificationEngine.js`** (new): Rule evaluation — keyword/tier/VIP conditions → BullMQ queue
- **`src/workers/notificationWorker.mjs`** (new): BullMQ worker — LINE push via `pushMessage()`, template vars, SIGTERM graceful shutdown
- **`src/lib/queue.js`** (new): BullMQ queue singleton for notifications
- **`prisma/schema.prisma`**: Added `NotificationRule` model

#### LINE Messaging
- **`src/lib/lineService.js`**: Added `pushMessage(to, messages)` — circuit breaker (quota → silence 24h via Redis)

#### Webhook Integration
- **`src/app/api/webhooks/facebook/route.js`**: Integrated `notificationEngine.evaluateRules('MESSAGE_RECEIVED')`
- **`src/app/api/webhooks/line/route.js`**: Integrated notification engine + records LINE messages in Message table

#### Testing
- **`src/lib/__tests__/notificationEngine.test.js`** (new): Vitest — 4 test cases

### Documentation

#### Project Docs (International Standards Compliance)
- **`README.md`** (new): Entry point — quick start (7 steps), tech stack, architecture diagram, key docs index
- **`.env.example`** (new): Environment template ครบทุก variable พร้อม comment — แทน `.env` ที่ไม่ควร commit
- **`CONTRIBUTING.md`** (new): Commit convention (Conventional Commits), branch strategy, ADR process, coding rules, sync-docs protocol
- **`docs/guide/getting-started.md`** (new): Step-by-step developer setup — clone → install → docker → prisma → dev server
- **`docs/database_erd.md`**: Rewritten ครบ 23 models — Customer, Conversation, Employee, Product, Marketing (10 models), Task, AuditLog พร้อม key fields และ ADR references

#### Agent Tooling
- **`.claude/skills/sync-docs.md`** (new): 9-step protocol สำหรับ sync context docs หลังทำงาน — ใช้ได้ทั้ง Claude Code (`/sync-docs`) และ Gemini CLI
- **`CLAUDE.md`**: เพิ่ม Auto-Update Protocol section — บังคับ sync docs หลัง commit ทุกครั้ง
- **`~/.claude/settings.json`**: PostToolUse hook — remind เมื่อ code files เปลี่ยน

#### Context Files Sync (2026-03-14)
- **`CLAUDE.md`**: v0.13.0 → ✅ released, เพิ่ม v0.14.0 planned, อัปเดต date
- **`GEMINI.md`**: Phase 12 → [DONE], Phase 13 → [CURRENT], ลบ contradictions ภายในไฟล์
- **`GOAL.md`**: เพิ่ม Phase 11 + Phase 12 detail sections + Phase 13 planned

---

## [0.13.0] — 2026-03-13

### Phase 12 — Unified Inbox & Performance Optimization

#### Unified Inbox (ADR-033)
- **`src/components/UnifiedInbox.js`** (new): ศูนย์รวมแชท Facebook + LINE — รองรับการกรองตาม Channel และ Status (Open, Pending, Closed), ค้นหาลูกค้า, และ pagination โหลดแชททีละ 10 รายการ
- **`src/app/api/inbox/conversations/route.js`** (new): `GET` conversations พร้อมระบบ search & filtering
- **`src/app/api/inbox/conversations/[id]/messages/route.js`** (new): `GET` message history + `POST` send message
- **Data Seeding**: อัปเดต `prisma/seed.ts` ให้รวมตัวอย่าง Conversation และ Message สำหรับการเทสระบบ Inbox

#### Redis Caching Layer (ADR-034)
- **`src/lib/redis.js`** (new): Redis singleton client ครอบด้วย `getOrSet` pattern เพื่อมาตรฐานการทำ cache
- **`src/app/api/analytics/executive/route.js`**: เชื่อมต่อระบบ Cache — ลด latency ของ dashboard จาก ~2s เหลือ < 50ms โดยเก็บผล aggregation ไว้ 5 นาที

#### Bug Fixes & Stability
- **`src/middleware.js`**: ตรวจสอบ RBAC และ Permission สำหรับ Unified Inbox routes
- **Performance**: เพิ่ม index บน Database schema เพื่อเร่งความเร็วในการ query แชทตามวันที่และสถานะ

---

## [0.12.0] — 2026-03-13

### Phase 12 — UI Enhancement: Icon Sidebar + Charts + Motion + Lucide

#### Sidebar Redesign (ADR-031)
- **`src/components/Sidebar.js`**: ปรับ layout เป็น icon-only `w-20` — ลบ text label ออก, เพิ่ม tooltip hover (popup ขวา), group separator เส้นบาง, active left-bar indicator
- **Lucide React migration**: แทน FontAwesome CDN ด้วย `lucide-react` (tree-shakeable) ครบทุก icon ใน Sidebar และ TopBar
- **`src/components/TopBar.js`** (new): Global navigation header — search input, TH/EN language toggle, dark/light theme toggle, notification bell — ใช้ Lucide icons ทั้งหมด

#### Charts & Data Visualization (A1)
- **`src/components/ExecutiveAnalytics.js`**: เพิ่ม Recharts `AreaChart` (Ads vs Store Revenue trend) + `BarChart` (daily order volume) พร้อม timeframe toggle [7d/30d/90d]
- **`src/app/api/analytics/executive/history/route.js`** (new): `GET ?days=7|30|90` — GROUP BY date split by `conversationId IS NULL/NOT NULL` → `revenueHistory[]` + `dailyOrders[]`
- **`src/lib/repositories/analyticsRepository.js`** (new): `getRevenueHistory(days)` — Prisma aggregation ผ่าน repository pattern

#### Animations (A2)
- **`src/app/page.js`**: `AnimatePresence` + `motion.div` page transition fade+slide (200ms) เมื่อเปลี่ยน activeView
- **`src/components/Dashboard.js`**: `AnimatedNumber` — `useSpring` stiffness:80/damping:20 animate stat จาก 0 → จริง

#### Employee Directory Redesign
- **`src/components/EmployeeManagement.js`**: เขียนใหม่ทั้งหมด — stacked card deck (3 ghost cards + swipe/drag), dot pagination, thumbnail strip, dashboard 4 tabs (Overview / Permissions / Customers / Sales), role-color system, edit modal

#### Infrastructure
- **Node.js upgrade**: `node:20-alpine` → `node:22-alpine` ทุก Dockerfile stage, เพิ่ม `.nvmrc` + `engines.node >=22`
- **Git versioning**: tags `v0.9.0`–`v0.12.0` + branch `stable`

#### Cleanup
- ลบไฟล์ขยะ Gemini fragment (`",\n    keyMetric: "`)

---

## [0.11.0] — 2026-03-12

### Executive Analytics — Revenue Split by Channel

- **`src/app/api/analytics/executive/route.js`**: แยกยอดขายเป็น 2 ประเภทโดยดูจาก `conversationId` — `revenueAds` (ออนไลน์/มี conversationId) vs `revenueStore` (Walk-in/ไม่มี conversationId) พร้อม % change เทียบ prev period สำหรับทั้ง 3 ค่า
- **`src/components/ExecutiveAnalytics.js`**: เพิ่ม stat cards แยก Ads Revenue (blue) และ Store Revenue (emerald) พร้อม % change indicator — timeframe selector แก้ key mismatch (`week`→`this_week`, `month`→`this_month`) ให้ตรงกับ `getDateRange()`
- **`src/lib/timeframes.js`** (new): `getDateRange(timeframe)` — คืน `{ current, prev }` Prisma date filter สำหรับ today / this_week / this_month / last_month / last_90d / ytd / all_time

### Foundation — Repository Layer & Instrumentation

- **`src/lib/repositories/customerRepo.js`** (new): `getAllCustomers(opts)` (search + paginate), `getCustomerById` (include orders×5, conversations×3), `upsertCustomerByPsid`, `upsertCustomerByPhone` — ใช้ `generateCustomerId()` จาก idGenerator ตาม id_standards
- **`src/lib/repositories/employeeRepo.js`** (new): `getAllEmployees(opts)`, `getEmployeeById`, `getEmployeeByFbName` — JSONB path query `identities.facebook.name`
- **`src/lib/repositories/marketingRepo.js`** (new): `getCampaignWithMetrics` (include adSets→ads), `getAdDailyMetrics(adId, days)`, `upsertAdDailyMetric` — composite key `adId_date`
- **`src/instrumentation.js`** (new): Next.js instrumentation hook — cron `0 9 * * *` ตรวจ Creative Fatigue (threshold=14d, minSpend=฿500), ส่ง LINE alert ถ้าพบ, `NEXT_RUNTIME === 'nodejs'` guard

---

## [0.5.0] — 2026-03-11

### Docker — 4-Stage Multi-Stage Build (2026-03-12)

- **`Dockerfile`**: Refactored เป็น 4-stage build — `deps` → `builder` → `migrator` → `runner`
- **Stage `migrator`**: One-shot container รัน `prisma migrate deploy` ด้วย full `node_modules` (รองรับ Prisma v7 ที่ eager-load `@prisma/dev` devDeps) แล้ว exit 0
- **Stage `runner`**: Slim image — copy เฉพาะ `@prisma/adapter-pg`, standalone build, ไม่มี Prisma CLI
- **`docker-compose.yml`**: เพิ่ม `crm_migrator` service (`restart: on-failure`), `crm_app` depends on `migrator: service_completed_successfully`
- **`docker-entrypoint.sh`**: ลด scope — ลบ migration step ออก เหลือแค่ `exec node server.js`
- **Fix**: macOS symlink COPY bug — `node_modules/.bin/prisma` เป็น symlink, Docker แปลงเป็น regular file ทำให้ WASM path เสีย แก้ด้วยการชี้ตรงไปที่ `node_modules/prisma/build/index.js` ใน migrator stage

### Phase 11 — UI → Backend Wiring (2026-03-09)

- **`src/app/page.js`**: Wire ทุก component ให้ดึงข้อมูลจาก real API endpoints แทน mock/JSON data
- **`src/app/api/auth/[...nextauth]/route.js`**: Auth system fully operational — session management, JWT strategy, role propagation
- **`src/utils/idGenerator.js`** (new): `generateCustomerId(channel)` — sequential serial ต่อ channel+year ตาม `TVS-CUS-[CH]-[YY]-[XXXX]` format (id_standards compliant)

### Phase 8-10 — AI Intelligence & Marketing UX (2026-03-09)

- **`src/app/api/ai/analyze/route.js`** (new): `GET` — aggregate key metrics (customers, orders, active ads, revenue) + Gemini summary with insights & recommendations
- **`src/app/api/ai/chat/route.js`** (new): `POST` — conversational AI interface สำหรับ business queries
- **`src/app/api/ai/discover-products/route.js`** (new): Product discovery ผ่าน Gemini
- **`src/app/api/catalog/route.js`** (new): Product catalog API
- **`src/app/api/marketing/ad-calendar/route.js`** (new): `GET` — ดึง ads ตาม date range (`since`/`until`) สำหรับ calendar view
- **`src/app/api/marketing/mapping/route.js`** (new): Read/write `data/ad-mapping.json` — campaign/ad name mapping สำหรับ attribution
- **`src/app/api/marketing/sync-incremental/route.js`** (new): `POST` — fire-and-forget incremental sync (last 24h) ผ่าน background fetch
- **`src/lib/eventBus.js`** (new): Global `EventEmitter` singleton (`global.__eventBus`) — รองรับ SSE clients หลายคน, `setMaxListeners(100)`
- **`src/app/api/events/stream/route.js`** (new): SSE endpoint — broadcast `chat-updates` events ผ่าน `eventBus`, heartbeat ทุก 30s, cleanup on disconnect

### Inbox System — Status Machine & Real-Time (2026-03-09–11)

- **`src/app/api/marketing/chat/conversations/route.js`**: List conversations พร้อม filter (status, starred, assignee) + unread count
- **`src/app/api/marketing/chat/conversations/[id]/status/route.js`**: PATCH — status machine: `OPEN` → `PENDING` → `RESOLVED` → `CLOSED`
- **`src/app/api/marketing/chat/assign/route.js`**: Assign conversation ให้ employee
- **`src/app/api/marketing/chat/send/route.js`**: ส่งข้อความผ่าน Meta Graph API + บันทึก Message ใน DB
- **`src/app/api/marketing/chat/read/route.js`**: Mark conversation read — reset `unreadCount = 0`
- **`src/app/api/marketing/chat/star/route.js`**: Toggle `isStarred` บน Conversation
- **Facebook read-receipt handler**: Webhook ประมวล `message_reads` event อัปเดต `deliveryStatus`

### Phase 7 — Marketing Sync & Data Alignment (2026-03-11)

- **`src/app/api/marketing/sync/route.js`**: Enhanced logic to pull **Daily Breakdown** (`time_increment=1`) from Meta Graph API. Upsert insights into `AdDailyMetric` to enable trend charts. Updated aggregated totals at `Ad` level (ADR-024).
- **Meta Business Suite Analysis**: [NEW] Analyzed `Meta Business Suite.html` (14MB) to extract chat bubble structures. Identified Atomic CSS classes `xney33w` (Admin/Outgoing) and `x3wr0uh` (Customer/Incoming) and documented their radius/alignment properties for UI replication.
- **`src/app/api/marketing/campaigns/route.js`**: Flattened metric properties (`spend`, `impressions`, `clicks`, `revenue`) into the top-level campaign object for direct UI consumption.
- **`src/components/FacebookAds.js`**: Verified UI data access points and confirmed compatibility with flattened API response.
- **`src/components/CampaignTracking.js`**: Fixed hydration error by replacing invalid `<p>` tags nesting `<div>` (from `AskAIButton`) with proper `<div>` tags in KPI cards.### [Phase 11] - 2026-03-12
- **Fixed**: `FacebookChat.js` runtime error when loading employees (API response handling).
- **Fixed**: Chat message alignment issue (clumping). Improved sender identification using Facebook echoes and metadata.
- **Improved**: Data resilience in `CustomerList.js` and `FacebookChat.js` with array safety guards.
- **`src/app/api/analytics/admin-performance/route.js`**: Normalized response by adding missing `name` and `fullName` fields to prevent UI crashes.
- **UI Components**: Applied defensive coding patterns `(name || '').charAt(0)` across `AdminPerformance`, `TeamKPI`, `Analytics`, `Sidebar`, `EmployeeManagement`, `FacebookChat`, and `Orders` to prevent `TypeError` on missing data.
- **`src/lib/lineService.js`**: Added `sendLineAlert` function to support push notifications via LINE Messaging API (ADR-016).
- **`src/instrumentation.js`**: [NEW] Implemented Next.js instrumentation hook with a `node-cron` job running at 09:00 daily to detect and alert on Creative Fatigue.
- **`src/lib/repositories/`**: [NEW] Created `customerRepo.js`, `employeeRepo.js`, and `marketingRepo.js` to standardize data access patterns and improve maintainability.

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
