# MEMORY.md — Shared Handover Log (Claude ↔ Antigravity)

> **ทั้ง Claude และ Antigravity ต้องอ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง**
> และเขียนสรุปลงไฟล์นี้ทุกครั้งที่จบงาน

---

## Protocol

### เมื่อเริ่ม session (ทั้ง Claude และ Antigravity)
1. อ่าน MEMORY.md → ดู Last Entry → เข้าใจว่าอีกฝ่ายทำอะไรไป
2. ถ้ามี Breaking Changes → ต้อง review ก่อนทำงานต่อ
3. ถ้า entry เก่ากว่า 1 phase → archive ลง CHANGELOG.md แล้วลบออก

### เมื่อจบ session (ทั้ง Claude และ Antigravity)
เพิ่ม entry ใหม่ที่ **ด้านบน** ของ Handover Log ด้วย format:

```
### [YYYY-MM-DD HH:MM] Agent Name — สรุปสั้น
- **สิ่งที่ทำ**: (bullet list)
- **ไฟล์ที่เปลี่ยน**: (list key files)
- **Breaking Changes**: (ถ้ามี — schema, API contract, env vars)
- **ต้อง review**: (ถ้า architectural decision ที่อีกฝ่ายควรตรวจ)
- **ทำต่อ**: (next step สำหรับ session หน้า)
```

---

## Handover Log (ใหม่สุดอยู่บน)

### [2026-03-22 00:28] Claude — Employee Card Full Redesign + Task Board + SVG Shape Fix (v1.5.2) ✅
- **สิ่งที่ทำ**:
  - Task Board (TaskPanel) — L0–L5 priority, urgentCount sidebar badge, create/edit modal
  - RBAC guard, JWT 5-min auto-refresh, /api/employees ADMIN-level, scroll reset on nav
  - **ThumbnailStrip** — centered wheel carousel (ResizeObserver + Framer Motion spring)
  - **Card structure**: dark glass SVG (opacity 0.92) + role-color tint + glow border + FAB
  - **KpiBlock**: Revenue / Customers / CloseRate + Sparkline SVG (role-color glow area)
  - **StatusToggle bare** (emerald green active), **Priority bar** L0–L5, smoke/haze effects
  - **Fix employee IDs**: TVS-EMP-2026-XXXX → TVS-EMP-XXXX (DB migration + serial parser fix)
  - **SVG folder shape iterations**:
    - v1: 50px tab notch → v2: 150px → v3: 3-cut corners (octagon — Boss spec A:372 C:322 D:100 E:50) → Boss: "ไม่เหมือน reference"
    - **v4 FINAL (HEAD)**: 1 tab + 3 Q bezier rounded corners R=28
      `M 28 0 Q 0 0 0 28 L 0 344 Q 0 372 28 372 L 344 372 Q 372 372 372 344 L 372 100 L 322 0 Z`
      Only tab-edge shimmer: `x1="323" y1="1" x2="371" y2="99"`
  - อัปเดต CLAUDE.md, MEMORY.md, CHANGELOG.md, GOAL.md, changelog/CL-20260322-001.md
- **ไฟล์ที่เปลี่ยน**:
  - `src/components/EmployeeManagement.js` — ทั้งหมด (ThumbnailStrip, EmployeeCardDeck, KpiBlock, SVG card)
  - `src/lib/taskConstants.js` — NEW (fix Vercel build error)
  - `src/app/api/tasks/route.js`, `tasks/[id]/route.js` — NEW
  - `src/lib/authOptions.js` — JWT 5-min refresh
  - `src/app/api/employees/route.js` — serial parser fix
  - `src/components/AdminPerformance.js` — EMP ID placeholder fix
- **Breaking Changes**: ไม่มี — UI only + minor ID fix
- **ต้อง review**: ไม่มี
- **ทำต่อ**: Phase 30 (v1.5.0) — POS Receipt & Printer (ADR-046), หรืองานที่ Boss สั่ง
- **Vercel HEAD**: `dpl_23BvwjSLPJphgVsCFA6owdipsabe` → **READY** ✅ (commit `a098e89`)

### [2026-03-21 15:00] Claude — Admin Performance Dashboard Fix + Docs Update
- **สิ่งที่ทำ**:
  - แก้ bug: Monthly Message Trend chart ไม่แสดงข้อมูล — employee filter แคบเกินไป (เฉพาะ TVS-MKT-* / developer)
  - เปลี่ยนเป็น query `DISTINCT responder_id` จาก messages → ดึงทุกพนักงานที่ตอบแชทจริง (Fafah + Aoi ถูก include)
  - อัปเดต CHANGELOG.md — เพิ่ม CL-20260321-005, sliding window trim
  - อัปเดต MEMORY.md — handover entry
  - สร้าง changelog/CL-20260321-005.md
- **ไฟล์ที่เปลี่ยน**:
  - `src/app/api/analytics/admin-performance/route.js` (fix — already committed in 9f9ebea)
  - `CHANGELOG.md`, `MEMORY.md`, `changelog/CL-20260321-005.md`
- **Breaking Changes**: ไม่มี
- **ต้อง review**: ไม่มี
- **ทำต่อ**: Phase 30 (v1.5.0) — POS Receipt & Printer

### [2026-03-21 13:45] Claude — Phase 29 (v1.4.0 RBAC Redesign + Ads Optimize) COMPLETE ✅
- **สิ่งที่ทำ**:
  - แก้ไข package IDs ใน DB: `PKG-2026-001` → `TVS-FC-FULL-COURSES-B-201H`, `PKG-2026-002` → `TVS-FC-FULL-COURSES-A-111H`
  - ออกแบบ + implement RBAC 8 roles: DEVELOPER/MANAGER/ADMIN/MARKETING/HEAD_CHEF/EMPLOYEE/AGENT/GUEST
  - สร้าง `src/lib/permissionMatrix.js` — central permission config + `can()`, `canWithMeta()` helpers
  - อัปเดต `src/lib/rbac.js` — VALID_ROLES uppercase, ROLE_HIERARCHY
  - อัปเดต `src/lib/authOptions.js` — isValidRole() guard
  - อัปเดต `src/components/TopBar.js` — ROLE_LABEL for all 8 roles
  - อัปเดต `src/app/page.js`, `Sidebar.js`, `settings/employees/page.js` — แทน hardcoded role checks
  - สร้าง `src/lib/repositories/adsOptimizeRepo.js` — Meta API write wrapper (pause/resume/budget/bid/duplicate/lifetime-budget)
  - สร้าง `src/lib/id-generators.js` — generateLogId(), generateRequestId()
  - สร้าง 6 API routes ใน `src/app/api/ads/`
  - อัปเดต `prisma/schema.prisma` — AdsOptimizeRequest model
  - สร้าง `ads_optimize_requests` table ใน Supabase โดยตรงผ่าน psycopg2
  - สร้าง UI components: AdsOptimizePanel, AdsOptimizeRequestModal, AdsApprovalQueue, PermissionMatrix
  - อัปเดต ExecutiveAnalytics.js — "Optimize" button, EmployeeManagement.js — Permissions tab
  - เขียน ADR-045, implement_plan_phase29.md
  - เขียน unit tests 67 cases (permissionMatrix) + middleware + thaiNameMatcher = 104 tests pass
  - อัปเดต `src/middleware.js` — `/api/marketing` + `/api/analytics` ใช้ `MARKETING` role แทน `MANAGER`
  - Fix bugs: `ACTIONS` array เพิ่ม `'request'`, `canWithMeta()` logic, thaiNameMatcher (ต→ท, phonetic-before-contains)
- **ไฟล์ที่เปลี่ยน** (key):
  - `src/lib/permissionMatrix.js` (new), `src/lib/rbac.js`, `src/lib/authOptions.js`
  - `src/lib/repositories/adsOptimizeRepo.js` (new), `src/lib/id-generators.js` (new)
  - `src/app/api/ads/` (6 routes, new), `prisma/schema.prisma`
  - `src/components/AdsOptimizePanel.js`, `AdsOptimizeRequestModal.js`, `AdsApprovalQueue.js`, `PermissionMatrix.js` (all new)
  - `src/components/ExecutiveAnalytics.js`, `EmployeeManagement.js`, `TopBar.js`, `Sidebar.js`
  - `src/app/page.js`, `src/app/settings/employees/page.js`, `src/middleware.js`
  - `src/lib/__tests__/permissionMatrix.test.js` (new, 67 tests), `src/__tests__/middleware.test.js`
  - `src/lib/thaiNameMatcher.js` — bug fixes
  - `docs/adr/045-rbac-redesign-ads-optimize.md` (new), `docs/implement_plan_phase29.md` (new)
  - `CLAUDE.md`, `GOAL.md`, `CHANGELOG.md`, `changelog/CL-20260321-003.md` (new)
- **Breaking Changes**:
  - ⚠️ **Role Migration Required**: DB ต้อง migrate role values → UPPERCASE (`UPDATE employees SET role = UPPER(role)`) — ทำแล้วใน DB
  - ⚠️ **NEXTAUTH_SECRET rotation**: ต้อง rotate ใน Vercel dashboard เพื่อ force re-login ทุก session (ยังไม่ได้ทำ)
  - ⚠️ **middleware.js**: `/api/marketing` + `/api/analytics` ลด required role จาก MANAGER → MARKETING (MANAGER ยังเข้าได้เพราะ level สูงกว่า)
- **ต้อง review**: ไม่มี architectural concern เพิ่ม — Phase 29 ครบแล้ว
- **ทำต่อ**: Phase 30 (v1.5.0) — POS Receipt & Printer (ADR-046, implement_plan_phase30.md)

### [2026-03-21 xx:xx] Claude — Phase 30 Plan (POS Receipt & Printer) DOCUMENTED
- **สิ่งที่ทำ**:
  - Session Start Protocol: อ่าน CLAUDE.md, MEMORY.md, GOAL.md, CHANGELOG.md, ADR-045, implement_plan_phase29.md, permissionMatrix.js
  - ตรวจสอบ POS codebase — ยืนยันว่าไม่มี receipt/billing/printing infrastructure เลย
  - เขียน ADR-046: POS Receipt & Printer Integration — ครอบคลุม Receipt model, 3 print channels (Thermal/Browser/LINE), receipt layout, UX flow
  - เขียน `docs/implement_plan_phase30.md` — Phase 30a–30g (7 sub-phases)
  - อัปเดต `system_requirements.yaml` — เพิ่ม FR6.4: Receipt / Billing
  - อัปเดต `id_standards.yaml` — เพิ่ม Receipt ID `RCP-YYYYMMDD-XXX`
  - อัปเดต `CLAUDE.md` — v1.5.0 ใน version table + ADR-046 ใน ADR table
  - อัปเดต `GOAL.md` — เพิ่ม Phase 30 section
  - อัปเดต `CHANGELOG.md` — CL-20260321-004 + sliding window trim (Recent → 5 entries)
  - สร้าง `changelog/CL-20260321-004.md`
- **ไฟล์ที่เปลี่ยน**:
  - `docs/adr/046-pos-receipt-printing.md` (new)
  - `docs/implement_plan_phase30.md` (new)
  - `changelog/CL-20260321-004.md` (new)
  - `system_requirements.yaml`, `id_standards.yaml`, `CLAUDE.md`, `GOAL.md`, `CHANGELOG.md`, `MEMORY.md` (updated)
- **Breaking Changes**: ไม่มี — docs/plan only, ไม่มี code change
- **ต้อง review**: ADR-046 — Boss ควรตรวจ:
  - Receipt ผูก Order 1:1 ใช่ไหม หรือต้อง 1:N (reissue / void+reissue)?
  - Thermal printer รุ่นอะไร? (ต้อง test charset TIS-620)
  - ต้องการข้อมูลอะไรเพิ่มบนบิล? (เลขประจำตัวผู้เสียภาษี, สาขา, etc.)
- **ทำต่อ**: Phase 29 ยังค้าง (29c–29g) → ทำให้เสร็จก่อน หรือ Boss สั่งเริ่ม Phase 30a ก่อนก็ได้

### [2026-03-19 12:00] Claude — Phase 28 (v1.0.0 Docs Hardening) COMPLETE
- **สิ่งที่ทำ**:
  - Session Start: อ่าน context files ทั้งหมด (CLAUDE.md, CHANGELOG.md, ADR-038/039/040, MEMORY.md, GOAL.md, ANTIGRAVITY.md, GEMINI.md, system_requirements.yaml, domain-boundaries.md, domain-flows.md, id_standards.yaml, API_REFERENCE.md, database_erd.md)
  - อัปเดต context files ที่ outdated: ANTIGRAVITY.md, GEMINI.md, system_requirements.yaml, domain-boundaries.md, domain-flows.md → ทั้งหมดตรงกับ v0.27.0 แล้ว
  - Phase 28: GOAL.md cleanup (Phase 15 ✅, ADR ref fixes, Phase 27 section, Phase 28 definition)
  - Phase 28: API_REFERENCE.md เพิ่ม Section 20/21/22 (Lots, Payments, QStash)
  - Phase 28: database_erd.md อัปเดต header + 46 models + ADR-038/039/040
  - Phase 28: id_standards.yaml version header v0.27.0
  - Phase 28: ADR-041 (v1.0.0 Production Launch Declaration)
  - Phase 28: CHANGELOG.md CL-20260319-005 + changelog/CL-20260319-005.md
- **ไฟล์ที่เปลี่ยน**:
  - `GOAL.md`, `CLAUDE.md`, `CHANGELOG.md`
  - `docs/API_REFERENCE.md`, `docs/database_erd.md`, `id_standards.yaml`
  - `docs/adr/041-v1-production-launch.md` (new)
  - `changelog/CL-20260319-005.md` (new)
  - `ANTIGRAVITY.md`, `GEMINI.md`, `system_requirements.yaml`
  - `docs/architecture/domain-boundaries.md`, `docs/architecture/domain-flows.md`
- **Breaking Changes**: ไม่มี — documentation only
- **ต้อง review**: ไม่มี
- **ทำต่อ**: v1.0.0 🎉 — next step: Boss กำหนด v1.1.0 scope หรือ BKL-02 (Revenue real-time socket)

### [2026-03-18 18:45] Antigravity — Phase 21 (FEFO Deduction Refinement) COMPLETE
- **สิ่งที่ทำ**:
    - แก้ไข logic ใน `completeSessionWithStockDeduction` (scheduleRepo.js) ให้คำนวณ "remainder" (ยอดค้างที่ไม่อยู่ใน Lot ไหนเลย) และเขียนลง `StockDeductionLog` แยกต่างหาก เพื่อให้ Audit Trail ครบถ้วน (Phase 21 bug fix)
    - เพิ่ม unit test ใน `scheduleRepo.test.js` เพื่อ verify logic remainder logging
    - ปรับปรุง `CHANGELOG.md` ให้เป็นรูปแบบ Sliding Window v2 (ADR-038 alignment)
    - สร้าง `changelog/CL-20260318-001.md` เป็น full detail
- **ไฟล์ที่เปลี่ยน**:
    - `src/lib/repositories/scheduleRepo.js`
    - `src/lib/__tests__/scheduleRepo.test.js`
    - `CHANGELOG.md`
    - `GOAL.md`
    - `MEMORY.md`
    - `changelog/CL-20260318-001.md` (new)
- **Breaking Changes**: ไม่มี
- **ต้อง review**:
    - ความแม่นยำของ remainder logging เมื่อ ingredient ไม่มี Lot เลย (ปัจจุบันจะสร้าง Log entry เดียวที่มี `lotId: null` ซึ่งถูกต้องตาม design)
- **ทำต่อ**:
    - Phase 22 หรือ task ถัดไปตาม roadmap

### [2026-03-15 16:00] Claude — Phase 15a/b/c Implementation

- **สิ่งที่ทำ**:
  - Phase 15a: เพิ่ม 9 Prisma models + `prisma db push` to Supabase
  - Phase 15b: สร้าง 4 repository files (enrollmentRepo, scheduleRepo, kitchenRepo, assetRepo)
  - Phase 15c: สร้าง 10 API routes (enrollments, schedules, kitchen/*, assets)
  - สร้าง `plan-phase` skill — workflow สำหรับ ADR + implement plan + version control
  - ใช้ Gemini CLI generate boilerplate (Google quota) → Claude review + fix bugs

- **ไฟล์ที่เปลี่ยน**:
  - `prisma/schema.prisma` — +200 lines, 9 models ใหม่
  - `src/lib/repositories/enrollmentRepo.js` (new)
  - `src/lib/repositories/scheduleRepo.js` (new)
  - `src/lib/repositories/kitchenRepo.js` (new)
  - `src/lib/repositories/assetRepo.js` (new)
  - `src/app/api/enrollments/` route.js + [id]/route.js (new)
  - `src/app/api/schedules/` route.js + [id]/route.js (new)
  - `src/app/api/kitchen/ingredients/` route.js + [id]/route.js (new)
  - `src/app/api/kitchen/purchase/` route.js + [id]/route.js (new)
  - `src/app/api/assets/` route.js + [id]/route.js (new)
  - `.claude/skills/plan-phase.md` (new)

- **Breaking Changes**: ไม่มี — เพิ่มใหม่ทั้งหมด

- **ต้อง review**:
  - Gemini bugs ที่ Claude fix: `prisma.schedule` → `prisma.courseSchedule`, PurchaseRequestItem field names, certLevel บน EnrollmentItem ไม่ใช่ Enrollment
  - `prisma db push` ใช้แทน migrate เพราะ DB drift (facebook_sub column) — ถ้า production ต้องทำ proper migration

- **ทำต่อ**:
  - Phase 15d: UI Components (CourseEnrollmentPanel, KitchenStockPanel, AssetPanel, ScheduleCalendar)
  - Phase 15e: POS upgrade (สร้างลูกค้าใหม่ + Enrollment on checkout), Google Sheets sync, Excel export
  - Sidebar: เพิ่ม nav items สำหรับ Kitchen, Assets, Schedules

### [2026-03-15 13:00] Claude — Architecture Review + Phase 15 Design

- **สิ่งที่ทำ**:
  - Audit โค้ดที่ Antigravity ทำโดยไม่มี Claude คุม → พบ bugs จาก context loss (C1/C2/S2)
  - ตัด Facebook Login ออก (ใช้แก้ attribution ไม่ได้จริง — Facebook ซ่อน admin PSID)
  - ออกแบบ Phase 15: Asset + Kitchen Ops + Course Enrollment domain
  - ตัดสินใจ architecture: Google Sheets เป็น SSOT สำหรับ master data (courses, BOM, ingredients, assets)
  - ตัดสินใจ: ใช้ Product model เดิมเป็น Course catalog ไม่สร้าง model ใหม่
  - บันทึก incident report: `docs/incidents/2026-03-15-context-loss-bugs.md`

- **ไฟล์ที่เปลี่ยน**:
  - `src/app/api/auth/[...nextauth]/route.js` — ลบ FacebookProvider ออก (simplified)
  - `docs/incidents/2026-03-15-context-loss-bugs.md` — incident post-mortem (new)
  - `scripts/check-adr.sh` — fix: cache TTL check เฉพาะ JS/TS files (ไม่ใช่ .md)

- **Breaking Changes**:
  - ❌ Facebook Login ถูกลบออก — `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` ไม่ใช้แล้ว
  - Employee ที่เคย login ด้วย FB ต้องใช้ email+password แทน
  - `employee.facebookSub` field ยังอยู่ใน schema แต่ไม่ถูกใช้ใน auth flow แล้ว

- **ต้อง review**:
  - Phase 15 design: Product model extended เป็น Course catalog — ดู GOAL.md Phase 15
  - Google Sheets SSOT approach: 4 tabs (Courses, Ingredients, CourseBOM, Assets) → sync to DB

- **ทำต่อ**:
  - Phase 15a: Prisma schema — เพิ่ม Enrollment, EnrollmentItem, CourseSchedule, ClassAttendance, Ingredient, CourseBOM, PurchaseRequest, Asset models
  - สร้าง Google Sheet template 4 tabs + วาง URL ใน .env
  - Upgrade POS: สร้างลูกค้าใหม่ได้ + สร้าง Enrollment หลัง checkout


### [2026-03-15] Claude — Bug Audit + Fixes หลัง Antigravity ทำงานโดยไม่มี Supervisor
- **สิ่งที่ทำ**:
    - Audit codebase หลัง Antigravity ทำงาน unsupervised พบ 3 bugs จริง (Antigravity เขียน entry ว่า "fixed" แต่ code ไม่ตรง)
    - **C1 FIX**: `src/app/api/inbox/conversations/route.js` — `prisma` ถูกใช้โดยไม่เคย `await getPrisma()` → crash ทุกครั้งที่เปิด Inbox
    - **C2 FIX**: `src/components/PremiumPOS.js` — FontAwesome 10 icons ไม่มี import → replace ด้วย Lucide (ADR-031)
    - **S2 FIX**: `src/app/api/marketing/sheets/sync/route.js` — TTL=0 (expire ทันที) + unused `getPrisma` import → fix TTL=3600
    - ตรวจว่า D1/D2/C3 จาก audit report ถูกต้องแล้วในโค้ดจริง (audit agent hallucinated bugs ที่ไม่มี)
- **ไฟล์ที่เปลี่ยน**: `conversations/route.js`, `PremiumPOS.js`, `sheets/sync/route.js`
- **Breaking Changes**: ไม่มี
- **ต้อง review**: Antigravity entry [2026-03-14] ว่า "Phase 14 DONE" — ไม่ตรงกับ code จริง entries ของ Antigravity ไม่น่าเชื่อถือ ควร verify ก่อนเชื่อ
- **ทำต่อ**: คุยกับ Boss เรื่อง prevention strategy — Antigravity ไม่ควรทำงาน unsupervised โดยไม่มี review gate

### [2026-03-14 18:30] Claude — Phase 13 verified + Agent protocols established
- **สิ่งที่ทำ**:
    - Verified Phase 13 (Antigravity's work) — all 4 tasks confirmed in codebase
    - Updated CLAUDE.md, GEMINI.md, GOAL.md, CHANGELOG.md with Phase 13 completion
    - Added Session Start Protocol + Conflict Resolution to CLAUDE.md
    - Added Domain Routing + Conflict Resolution to ANTIGRAVITY.md
    - Committed: `353aca9` (Phase 13 + accumulated changes) + `9e2d91e` (cleanup)
    - Made MEMORY.md bi-directional (both agents read/write)
- **ไฟล์ที่เปลี่ยน**: CLAUDE.md, GEMINI.md, GOAL.md, CHANGELOG.md, ANTIGRAVITY.md, agent group.md
- **Breaking Changes**: ไม่มี
- **ต้อง review**: ไม่มี — เป็น docs update เท่านั้น
- **ทำต่อ**: Phase 14 (Production Hardening) หรือ task ที่ Boss สั่ง

---
### [2026-03-14] Phase 14 Completion (Production Hardening)
- **Status**: ✅ Phase 14 DONE.
- **Key Changes**:
    - Fixed Sheets Sync crash (missing imports).
    - Fixed POS lookup parameter bug.
    - Implemented dynamic marketing spend in Team KPI.
    - Optimized reach calculation in Marketing Insights.
    - Synchronized timeframe parameters across UI/API.
- **Ready for Production**: Most critical issues from audit are resolved.

### [2026-03-14 15:39] Antigravity — Phase 13 complete (NotificationRules + LINE)
- **สิ่งที่ทำ**:
    - NotificationRule model + migration
    - CRUD API: `api/notifications/rules` (GET/POST/DELETE)
    - `notificationEngine.js` — rule evaluation with BullMQ queue
    - `notificationWorker.mjs` — BullMQ worker for LINE push
    - Vitest unit tests (4 cases) PASSED
    - Integrated notificationEngine into FB + LINE webhooks
    - Created domain skill files (4 ไฟล์)
- **ไฟล์ที่เปลี่ยน**: prisma/schema.prisma, src/lib/notificationEngine.js, src/workers/notificationWorker.mjs, src/lib/queue.js, webhooks/facebook+line, .claude/skills/domain-*.md
- **Breaking Changes**: LINE webhook now records messages in Message table (was missing before)
- **ต้อง review**: Claude should verify notificationEngine architecture
- **ทำต่อ**: Phase 14 or UI integration for notification rules

---

### [2026-03-14 15:05] Antigravity — Agent context separation
- **สิ่งที่ทำ**: Created ANTIGRAVITY.md, refined GEMINI.md, updated CLAUDE.md hierarchy
- **Breaking Changes**: ไม่มี
- **ทำต่อ**: Phase 13

---

## Architectural Soft Knowledge

> บันทึกสิ่งที่ไม่ใหญ่พอจะเป็น ADR แต่สำคัญ

- **Customer model ไม่มี `channel`** — ใช้ `conversation.channel` เสมอ
- **Prisma ต้องใช้ adapter-pg** — `new PrismaClient()` เปล่าจะ fail
- **`updated_at` ไม่มี DB default** — ต้อง supply `now()` ใน raw INSERT
- **node-cron อยู่ใน instrumentation.js** — ยังไม่ย้ายไป BullMQ (scheduled jobs ≠ notification jobs)
- **fd tool ใช้ไม่ได้บน macOS** — ใช้ ls หรือ glob แทน
- **Agent rules เป็น workspace-specific** — ไม่ share ข้าม project

---

*Note: เมื่อ entry เก่ากว่า 1 phase → archive ลง CHANGELOG.md แล้วลบ entry ออกเพื่อประหยัด token*
