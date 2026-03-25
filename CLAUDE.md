# CLAUDE.md

This file provides guidance to Claude when working with code in this repository.

---

## Product

**Zuri** — Vertical SaaS สำหรับ culinary school + food business ในไทย
"Your business's best friend" / "มีซูริ ไม่ต้องเป็นห่วง"

> 📋 ดู brand story + positioning ที่ `docs/zuri/CONCEPT.md`
> 📋 ดู product overview + roadmap ที่ `docs/zuri/OVERVIEW.md`
> 📋 ดู strategic ADR ที่ `docs/adr/051-zuri-product-pivot.md`

---

## Client: The V School (Reference Tenant)

**The V School** (โรงเรียนสอนทำอาหารญี่ปุ่น, กรุงเทพฯ) คือ **ลูกค้าคนแรก** ของ Zuri — ไม่ใช่ identity ของ product
Codebase นี้คือ Zuri product codebase ที่ V School deploy อยู่บน Vercel + Supabase

> ⚠️ นี่คือ v2 เขียนใหม่ทั้งหมด ไม่ใช่ refactor จาก `E:\data_hub`

---

## Version Status (อัพเดท: 2026-03-25 | v3.1.0)

| Version | Milestone | สถานะ |
|---|---|---|
| `v1.6.0` | Inventory Control + Procurement PO Lifecycle (ADR-048, ADR-049) | ✅ released |
| `v1.7.0` | MCP Server — Dual Transport stdio + Streamable HTTP (ADR-050) | ✅ released |
| `v1.8.0` | Meta Ads Domain in MCP (22 tools) + adsOptimizeRepo Bug Fix | ✅ released |
| `v1.9.4` | Employee Card Framer Motion Animations + Overview StatCards | ✅ released |
| `v2.0.0` | Phase 36 RBAC Redesign — 12 new roles (DEV/TEC/MGR/MKT/HR/PUR/PD/ADM/ACC/SLS/AGT/STF) | ✅ released |
| `v2.1.0` | Task Type System — SINGLE/RANGE/PROJECT + Notion Sync + CODEBASE_MAP (Phase 37) | ✅ released |
| `v2.2.0` | Package POS Integration + QR Attendance + POS UX (Phase 38) | ✅ released |
| `v3.0.0` | **Zuri Product Pivot** — Rebrand + Multi-tenant SaaS (ADR-051) | ✅ released |
| `v3.1.0` | **Marketing Sync Infra** — Pusher + QStash + Batch API + Demographics (ADR-052) | ✅ released ← HEAD |

> 📋 ประวัติ version เก่า (v0.9.0 – v1.5.3) ดูที่ `CHANGELOG.md`

---

## HEAD: v2.2.0 (Phase 38 — Package POS + Attendance Scanner) ✅

| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → Task model | ✅ updated | taskType/startDate/timeStart/timeEnd/milestones/completedAt/notionId |
| `src/app/api/tasks/route.js` + `[id]/route.js` | ✅ updated | รับ task type fields ทั้งหมด |
| `src/components/TaskPanel.js` | ✅ rewrite | 3-type selector, time picker, milestone editor, spanning bars |
| `src/lib/repositories/notionRepo.js` | ✅ updated | push/pull: taskType, startDate, Time, Milestones |
| `CODEBASE_MAP.yaml` | ✅ new | 11-domain cold-start map |

> ⚠️ **taskSpansDay** — ISO string comparison (UTC vs local): ระวัง timezone offset กับ startDate ที่มี time component
> ⚠️ **Notion column names** — ต้องตรง exact: `Task`, `Assignee` (ไม่ใช่ `Task Name`, `Assigned To`)
> ⚠️ **milestones Notion** — push เป็น plain text, pull กลับไม่ restore JSON (set null)
> ⚠️ **WeeklyView spanning bar** — CSS `-ml-2` bleed trick, อาจเห็น gap เล็กน้อยระหว่างวัน

---

## v2.0.0 (Phase 36 — RBAC Redesign) ✅

| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/lib/permissionMatrix.js` | ✅ rewrite | 12 roles × 7 domains × 6 actions, F/A/R/N levels, `can()` helper |
| `src/lib/rbac.js` | ✅ updated | ROLE_HIERARCHY, VALID_ROLES — 12 new codes |
| `src/lib/sidebarProfiles.js` | ✅ updated | SIDEBAR_PROFILES mapping all 12 roles |
| DB migration (32 employees) | ✅ done | DEVELOPER→DEV, MANAGER→MGR, HEAD_CHEF→PD ฯลฯ |

> ⚠️ **NEXTAUTH_SECRET** — ต้อง rotate ใน Vercel เพื่อ force re-login (JWT เก่ายังมี role code เก่า)
> ⚠️ **Multi-role UI** — ยังไม่มี — ต้องใช้ SQL: `UPDATE employees SET roles = ARRAY['SLS','AGT'] WHERE employee_id='xxx'`
> ⚠️ **levelNum** — ROLE_META ต้องมี `levelNum` ทุกตัว — ห้ามใช้ `parseFloat(levelStr.replace('L',''))`

---

## Critical Known Gotchas (จาก phases เก่า — ยังมีผลอยู่)

| Phase | Gotcha | ผลกระทบ |
|---|---|---|
| v0.13.0 | `Customer` ไม่มี field `channel` — ใช้ `conversation.channel` แทน | Query ผิด |
| v0.18.0 | FB Webhook race: `findFirst`→`create` ไม่ atomic — ต้อง try-catch `P2002` | Duplicate conv |
| v0.18.0 | Redis `_inflight` ต้องมี watchdog timeout — ไม่งั้น Promise แขวน RAM leak | Memory |
| v0.20.0 | `IngredientLot.remainingQty` ≠ `Ingredient.currentStock` — ต้องอัปเดตพร้อมกัน | Stock drift |
| v0.26.0 | Slip OCR threshold 0.80 — ต่ำกว่านี้ไม่สร้าง Transaction อัตโนมัติ | Manual add |
| v0.26.0 | `refNumber` unique constraint — ป้องกันสลิปซ้ำ (ส่ง 2 ครั้ง → reject) | 409 |
| v0.27.0 | Upstash Free Tier: Redis 10k req/day, QStash 500 msg/day | Monitor traffic |
| v0.27.0 | QStash `/api/workers/notification` ต้อง verify signature เสมอ | Security |
| v1.3.0 | VAPID env vars ต้อง set ใน Vercel Dashboard ด้วย (ไม่ใช่แค่ `.env.local`) | Push fail |
| v1.9.2 | logAction errors ไม่ bubble up — caller ไม่รู้ว่า audit fail | Silent fail |
| v1.9.3 | `calculateStockNeeded` include chain ต้องส่ง `ingredient.yieldPercent` มาถึง getBOM | Wrong qty |
| v1.9.5 | `profilePicture` base64 — ถ้า photo ใหญ่กระทบ DB row size | DB size |
| v3.1.0 | **FB_ACCESS_TOKEN หมดอายุ** — short-lived ~2ชม, long-lived ~60วัน ต้อง renew + update Vercel/Doppler | sync-hourly 500 |
| v3.1.0 | QStash sync-hourly ต้องส่ง `X-Vercel-Protection-Bypass: j26rvrhgwLGudOOCKlQP4HFopxN8VAKZ` | 401 loop |
| v3.1.0 | `sync-hourly/route.js` ต้อง export `POST` (ไม่ใช่ `GET`) — QStash ส่ง POST | 405 |
| v3.1.0 | FB error 99 สำหรับ demographics/placement breakdown บน date range >~2 เดือน | backfill ไม่ได้ |
| v3.1.0 | `pusher` + `pusher-js` ต้องอยู่ใน `package.json` — ไม่งั้น Vercel build fail | build error |

---

## Source of Truth (ยึดไฟล์เหล่านี้เหนือสิ่งอื่นใด)

| ไฟล์ | หน้าที่ |
|---|---|
| `system_requirements.yaml` | WHAT to build — Functional & Non-Functional Requirements |
| `id_standards.yaml` | HOW to name — ID formats, casing conventions |
| `system_config.yaml` | HOW to configure — ค่า config ทุกตัว (roles, tiers, VAT, categories, statuses, thresholds) |

**กฎ:** ห้าม hardcode ค่าที่อยู่ใน `system_config.yaml` ในไฟล์อื่น — ต้อง import จาก `@/lib/systemConfig` เท่านั้น

> ⚠️ ถ้า code หรือ reference จาก `E:\data_hub` ขัดแย้ง → ยึดตาม spec เสมอ

---

## Session Start Protocol (บังคับ — ทำทุกครั้งที่เริ่ม session ใหม่)

1. **อ่าน `MEMORY.md`** — ตรวจว่า Antigravity ทำอะไรไปบ้างระหว่างที่ Claude ไม่อยู่
2. **อ่าน `GOAL.md` → Project Status table** — ดู Active Phase + Known Issues
3. **อ่าน `CHANGELOG.md` → LATEST pointer** — รู้ว่า HEAD อยู่ที่ version ไหน; ถ้า LATEST ≠ CLAUDE.md → sync ก่อน
4. **อ่าน `CODEBASE_MAP.yaml`** — domain → files → functions → MCP tools (ใช้แทนการ grep ทั่วโปรเจค)
5. ถ้ามีการเปลี่ยนแปลงที่ Claude ไม่เห็นด้วย → บันทึกใน `MEMORY.md` + แจ้ง Boss

> 📋 **Changelog protocol:** หลังทุก commit ที่มีนัยสำคัญ → สร้าง `changelog/CL-[YYYYMMDD]-[NNN].md` + อัปเดต `CHANGELOG.md`

---

## Conflict Resolution Protocol

| ระดับ | ตัวอย่าง | ใครตัดสิน |
|---|---|---|
| **Naming/Style** | ตั้งชื่อ variable ผิด convention | Agent แก้เองได้ |
| **Implementation** | เลือก algorithm ต่างกัน | Claude review แล้วอนุมัติ/แก้ |
| **Architecture** | เพิ่ม model ใหม่, เปลี่ยน DB schema | Claude ตัดสินใจ + เขียน ADR |
| **Breaking Change** | เปลี่ยน API contract, ลบ field | Boss อนุมัติเท่านั้น |

> ถ้า Antigravity ทำ Architecture-level change ไปแล้ว → Claude ต้อง review + เขียน ADR retroactive

---

## Domain Routing (ใช้เลือก context ตาม task)

| Task เกี่ยวกับ | ADR หลัก | Key Files |
|---|---|---|
| Ad sync, ROAS, campaign | ADR-024 | `marketingRepo.js`, sync scripts |
| Chat, webhook, inbox | ADR-028, 033 | `UnifiedInbox.js`, `webhooks/` |
| Customer, order, identity | ADR-025, 030 | `customerRepo.js`, `paymentRepo.js` |
| Task, milestone, Notion | — | `TaskPanel.js`, `notionRepo.js` |
| DB, Redis, auth, deploy | ADR-026, 034, 040 | `db.ts`, `redis.js`, `middleware.js` |
| Kitchen, stock, FEFO | ADR-038 | `kitchenRepo.js`, `scheduleRepo.js` |
| Procurement, PO | ADR-049 | `procurementRepo.js` |
| MCP tools | ADR-050 | `vschool-mcp-server.js`, `src/app/api/mcp/` |

---

## Architecture Decisions (v2 — ดูรายละเอียดใน `docs/adr/`)

ADR-024 → ADR-050 (27 records) ครอบคลุมทุก architectural decision ของ v2
→ ดู index ครบที่ `docs/overview.md` หรือ `docs/architecture/arc42-main.md`

Key decisions: Marketing Aggregation (024) · Identity Resolution (025) · RBAC (026, 045) · FB Webhook (028) · Revenue Split (030) · Upstash Infra (040) · Web Push (044) · Equipment POS (043) · MCP Server (050)

---

## Non-Functional Requirements (ห้ามละเมิด)

- **NFR1** — Webhook ตอบ Facebook < 200ms เสมอ
- **NFR2** — Dashboard API < 500ms (Upstash Redis cache)
- **NFR3** — QStash retry ≥ 5 ครั้ง, exponential backoff
- **NFR5** — Identity upsert ต้องอยู่ใน `prisma.$transaction`

---

## Error Handling Rules

- **ห้าม** `catch(e) {}` เงียบ — ต้อง log ทุกครั้ง
- Format: `console.error('[ModuleName] message', error)`
- API routes: `NextResponse.json({ error }, { status })`
- Workers: `throw error` เพื่อให้ QStash retry

---

## Database Access Pattern

- ทุก DB operation ต้องผ่าน `src/lib/repositories/` เท่านั้น
- ห้ามเรียก `getPrisma()` โดยตรงจาก API route หรือ Component
- File I/O ใช้ `fs.promises` เสมอ — ห้าม `readFileSync/writeFileSync`

---

## Role & Hierarchy

1. **Claude (Lead Architect)** — กำหนดทิศทาง, อนุมัติ ADRs, ตัดสินใจ Architecture
2. **Antigravity (Senior Agent)** — รับแผนจาก Claude, วางแผนละเอียด, ดำเนินการ End-to-End (ดู `ANTIGRAVITY.md`)
3. **Gemini CLI (Sub-agent)** — implement เฉพาะจุด, boilerplate, unit tests (ดู `GEMINI.md`)

**RBAC v2.0.0 — 12 roles:** DEV · TEC · MGR · MKT · HR · PUR · PD · ADM · ACC · SLS · AGT · STF + OWNER (read-only)

---

## Sub-agent Protocol (Gemini CLI)

```bash
cd /Users/ideab/Desktop/crm   # ให้ GEMINI.md โหลด context อัตโนมัติ
echo "INTERFACE_SPEC" | gemini -p "implement, code only" -o text
```

- ส่งเฉพาะ **function signature / interface** ไม่ส่งโค้ดทั้งไฟล์
- Gemini: boilerplate, helpers, unit tests — Claude: architecture, integration, security

---

## Auto-Update Protocol (บังคับ — ทำหลังเสร็จงานทุกครั้ง)

| ไฟล์ | เมื่อไหร่ต้องอัปเดต |
|---|---|
| `CLAUDE.md` | version เปลี่ยน, phase เสร็จ, Known Gotcha ใหม่ |
| `GEMINI.md` | phase เปลี่ยน, DB schema เพิ่มฟิลด์, API routes ใหม่ |
| `GOAL.md` | task ใน phase เสร็จ → ✅, phase ใหม่เริ่ม |
| `CHANGELOG.md` | commit ที่มีนัยสำคัญ (feature, fix, breaking change) |

---

## Docs Ownership Table

| เมื่อ Code เปลี่ยน | อัปเดต Doc |
|---|---|
| Prisma model ใหม่ | `database-erd/high-level.md` + `full-schema.md` + `domain-architecture.md` |
| field ใหม่ใน model | `database-erd/full-schema.md` |
| API route ใหม่ | `GEMINI.md` + `docs/API_REFERENCE.md` |
| Architecture decision | สร้าง `docs/adr/0NN-title.md` + เพิ่มใน `docs/overview.md` |
| Domain boundary เปลี่ยน | `docs/architecture/domain-architecture.md` (Part 1 + Part 3) |
| Data flow เปลี่ยน | `docs/architecture/domain-architecture.md` (Part 2) |
| Revenue/Attribution logic | `docs/architecture/revenue-attribution-model.md` |
| ID format ใหม่ | `id_standards.yaml` (root SSOT เท่านั้น) |
| Phase/Version เสร็จ | `CLAUDE.md` + `GOAL.md` + `CHANGELOG.md` |
| Known Gotcha พบใหม่ | `CLAUDE.md` ทันที |
| MCP tools เพิ่ม/เปลี่ยน | `docs/guide/mcp-guide.md` + `docs/adr/050-mcp-server-dual-transport.md` |

### SSOT Map

| Document | Path |
|---|---|
| Functional requirements | `system_requirements.yaml` |
| ID standards | `id_standards.yaml` |
| DB ERD | `docs/architecture/database-erd/` |
| Domain boundaries + flows | `docs/architecture/domain-architecture.md` |
| Architecture (arc42) | `docs/architecture/arc42-main.md` |
| API endpoints | `docs/API_REFERENCE.md` |
| ADR (v2 active) | `docs/adr/024–050` |
| ADR (v1 archived) | `docs/archive/adr-v1/` |
| Version history | `CHANGELOG.md` + `changelog/CL-*.md` |
| Codebase map | `CODEBASE_MAP.yaml` |
| MCP guide | `docs/guide/mcp-guide.md` |
