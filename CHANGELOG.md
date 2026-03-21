**LATEST:** CL-20260321-005 | v1.4.1 | 2026-03-21

---

## 📋 Index (older entries)

| ID | Name | Version | Date | Severity | Tags |
|---|---|---|---|---|---|
| CL-20260321-005 | Admin Performance Fix (Monthly Message Trend) | v1.4.1 | 2026-03-21 | PATCH | #bugfix #analytics #dashboard |
| CL-20260321-004 | POS Receipt & Printer Plan (ADR-046) | v1.5.0 planned | 2026-03-21 | MINOR | #pos #receipt #printing #plan |
| CL-20260321-003 | RBAC Redesign + Ads Optimize (ADR-045) | v1.4.0 | 2026-03-21 | MINOR | #rbac #marketing #ads #roles |
| CL-20260321-002 | Web Push Inbox Real-time (ADR-044) | v1.3.0 | 2026-03-21 | MINOR | #inbox #push #realtime |
| CL-20260321-001 | Equipment Domain POS + Spec Fields | v1.2.0 | 2026-03-21 | MINOR | #pos #equipment #ui |
| CL-20260319-006 | POS Modal + Sheet ID Generation | v1.1.0 | 2026-03-19 | MINOR | #pos #sheets #id-generation |
| CL-20260319-001 | Comprehensive Unit Test Expansion | v0.24.0 | 2026-03-19 | MINOR | #testing #quality |
| CL-20260318-002 | Repository Layer Full Compliance | v0.23.0 | 2026-03-18 | MINOR | #repository #refactor |
| CL-20260318-001 | FEFO Stock Deduction Refinement | v0.22.0 | 2026-03-18 | MINOR | #kitchen #repository |
| CL-20260317-002 | Bug Audit + Repo Refactor | v0.21.0 | 2026-03-17 | PATCH | #bugfix #repository |
| CL-20260319-005 | Production Ready (Phase 28 — ADR-041) | v1.0.0 | 2026-03-19 | MINOR | #documentation #v1 #production |
| CL-20260319-004 | Upstash Infrastructure Migration | v0.27.0 | 2026-03-19 | MINOR | #infrastructure #upstash #qstash |
| CL-20260319-003 | Chat-First Revenue Attribution | v0.26.0 | 2026-03-19 | MINOR | #revenue #attribution #ocr |
| CL-20260319-002 | Production Hardening Complete | v0.25.0 | 2026-03-19 | MINOR | #security #reliability #production |
| CL-20260316-001 | Lot ID + Class ID | v0.20.0 | 2026-03-16 | MINOR | #schema #kitchen |
| CL-20260315-001 | Schema Hardening | v0.19.0 | 2026-03-15 | PATCH | #schema #prisma |

---

## 📝 Recent (last 5 — full content)

### [CL-20260321-005] v1.4.1 — Admin Performance Dashboard Fix (Monthly Message Trend)
**Date:** 2026-03-21 | **Severity:** PATCH | **Tags:** #bugfix #analytics #dashboard

Monthly Message Trend chart ไม่แสดงข้อมูล เพราะ employee filter ใน API แคบเกินไป (เฉพาะ TVS-MKT-* หรือ developer dept) → Fafah + Aoi ไม่ถูก include

#### Root Cause
`GET /api/analytics/admin-performance` hardcode filter `department: 'developer'` → AGENT employees ที่ตอบแชทจริงไม่ได้แสดง

#### Fix
เปลี่ยนจาก hardcoded department filter → query `DISTINCT responder_id` จาก `messages` table ก่อน แล้วใช้เป็น filter → ทุกพนักงานที่ตอบแชทจริงแสดงในกราฟ

#### File Changed
- `src/app/api/analytics/admin-performance/route.js`

---

### [CL-20260321-004] v1.5.0 — POS Receipt & Printer Integration Plan (ADR-046)
**Date:** 2026-03-21 | **Severity:** MINOR | **Tags:** #pos #receipt #printing #thermal #line #plan

วางแผน Phase 30 — ระบบออกบิล/ใบเสร็จจาก POS + เชื่อมต่อ thermal printer 80mm + ส่งบิลทาง LINE

#### Phase 30 Sub-phases
- **30a** Prisma Receipt model + `receiptRepo.js`
- **30b** Receipt API Routes (5 endpoints)
- **30c** Receipt Component + Print Preview Modal
- **30d** Thermal Printer 80mm (ESC/POS via Web Serial)
- **30e** LINE Receipt Send (PNG image)
- **30f** Receipt History Page + Sidebar nav
- **30g** POS Integration + Tests + Docs

#### Key Decisions (ADR-046)
- Receipt ผูก Order 1:1 — Receipt ID: `RCP-YYYYMMDD-XXX`
- 3 print channels: Thermal (Web Serial) / Browser (`window.print`) / LINE (PNG push)
- ESC/POS encode ฝั่ง client (zero backend dependency)
- Thai text: TIS-620 charset (code page 26)

#### Files Changed
- `docs/adr/046-pos-receipt-printing.md` (new)
- `docs/implement_plan_phase30.md` (new)
- `system_requirements.yaml`, `id_standards.yaml`, `CLAUDE.md`, `GOAL.md` (updated)

---

### [CL-20260321-002] v1.3.0 — Web Push Inbox Real-time (ADR-044)
**Date:** 2026-03-21 | **Severity:** MINOR | **Tags:** #inbox #push #realtime #adr044

ลบ SSE + polling ออกจาก UnifiedInbox ทั้งหมด แทนด้วย Web Push API (VAPID) ที่ทำงานจริงบน Vercel serverless

#### ทำไมไม่ใช้ SSE
- `eventBus` เป็น in-memory EventEmitter — ไม่ share state ข้าม Vercel Lambda instances
- SSE connection มี Vercel timeout 300s (Pro) ต้องการ reconnect logic ซับซ้อน
- Polling 30s → ยังต้องใช้ Vercel invocations อยู่ดี

#### Web Push Architecture
- Webhook FB/LINE → `notifyInbox()` → ยิง HTTP → Google/Mozilla push server → Service Worker → OS notification
- User click notification → `PUSH_NAVIGATE` postMessage → inbox refetch + auto-select conversation
- VAPID keys เก็บใน `.env.local` + Vercel env vars

#### Files Changed
- `public/sw.js` — Service Worker ใหม่ (push event, notification click, PUSH_NAVIGATE)
- `src/lib/pushNotifier.js` — server helper ยิง push ไปทุก subscription + cleanup expired
- `src/app/api/push/subscribe/route.js` — POST/DELETE subscription endpoint
- `prisma/schema.prisma` → `PushSubscription` model
- `webhooks/facebook/route.js` — เพิ่ม `notifyInbox()` fire-and-forget
- `webhooks/line/route.js` — เพิ่ม `notifyInbox()` fire-and-forget
- `UnifiedInbox.js` — ลบ SSE+polling, เพิ่ม SW registration + VAPID subscribe

---

### [CL-20260321-001] v1.2.0 — Equipment Domain POS + Spec Fields
**Date:** 2026-03-21 | **Severity:** MINOR | **Tags:** #pos #equipment #ui #schema

เพิ่มโดเมนอุปกรณ์ใน POS และฟิลด์สเปคครบชุด

#### POS Equipment Domain
- 3rd mainMode: 🔪 อุปกรณ์ (course / food / equipment)
- Sub-category filters: knife, kitchen, fish_tool, sushi, sharpening
- ORIGIN_COUNTRIES dropdown 12 ประเทศ (JP/CN/KR/TW/TH/DE/SE/FR/IT/US/VN/ES)

#### Product Card Badges
- Hand dominance badge: `✋L` (blue) / `R✋` (violet) ที่มุมขวาบน
- Shipping weight tag: `📦 XXXg` ที่มุมซ้ายล่าง
- Micro-tags ใต้ชื่อ: material, size, country flag

#### ProductDetailModal Equipment Panel
- Spec grid: hand, material, dimension, weight, box size, country flag
- Shipping section: total weight, box weight, W×L×H cm
- Inline edit: brand + country dropdown with auto-save

#### Schema Changes
- `Product` model: + `hand`, `material`, `boxDimW/L/H`, `boxWeightG`, `shippingWeightG`

---

### [CL-20260319-006] v1.1.0 — POS Modal + Sheet ID Generation (TVS format)
**Date:** 2026-03-19 | **Severity:** MINOR | **Tags:** #pos #sheets #id-generation #ui

เพิ่ม ProductDetailModal ใน POS + ระบบ auto-generate readable ID จาก Google Sheet ตาม format มาตรฐาน `TVS-[CATEGORY]-[PACK]-[SUBCAT]-[SERIAL]`

#### ProductDetailModal
- กดการ์ดสินค้า → popup รายละเอียด (image gallery ≤6, tags, meta chips, enrollment stats)
- Warning banner เมื่อ `pendingStudents ≥ 5` — "พิจารณาเปิดรอบใหม่"
- แสดง `productId` human-readable ใต้ชื่อสินค้า
- ปุ่ม "+" บนการ์ด → `e.stopPropagation()` → add to cart โดยไม่เปิด modal

#### generateProductId (แก้ format)
- แก้จาก `PRD-CRS-YYYY-XXX` (ผิด spec) → `TVS-{cuisineCode}-{packCode}-{subcatCode}-{SERIAL:02d}`
- PACKAGE → `TVS-PKG{pkgNo:02d}-{pkgShortName}-{hours}H`
- FULL_COURSE → `TVS-FC-FULL-COURSES-{A|B}-{hours}H`
- Serial ต่อ prefix (แต่ละ cuisineCode+packCode+subcatCode มี serial ของตัวเอง)

#### sync-master-data Sheet columns
- เพิ่ม: `productType`, `cuisineCode`, `packCode`, `subcatCode`, `pkgNo`, `pkgShortName`
- Auto-infer DB `category` จาก `cuisineCode` (JP→japanese_culinary, SP→specialty, ฯลฯ)

#### Session Start Protocol
- `CLAUDE.md` — เพิ่ม step 3: อ่าน `CHANGELOG.md` LATEST pointer ทุก session

---

*Older entries available in `changelog/CL-*.md` — see Index table above*
