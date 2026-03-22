**LATEST:** CL-20260322-006 | v1.8.0 | 2026-03-22

---

## 📋 Index (older entries)

| ID | Name | Version | Date | Severity | Tags |
|---|---|---|---|---|---|
| CL-20260322-006 | Meta Ads Domain in MCP (v1.8.0) + adsOptimizeRepo Bug Fix | v1.8.0 | 2026-03-22 | MINOR | #mcp #ads #marketing #bugfix |
| CL-20260322-005 | MCP Server v1.7.0 — Dual Transport stdio + Streamable HTTP (ADR-050) | v1.7.0 | 2026-03-22 | MINOR | #mcp #api #infrastructure #auth #middleware |
| CL-20260321-006 | V Point Loyalty + UI Overhaul (TopBar slim, Sidebar 3-mode) | v1.5.0-pre | 2026-03-21 | MINOR | #pos #loyalty #ui #sidebar #topbar |
| CL-20260322-003 | Inventory Control + Procurement PO Lifecycle (ADR-048, ADR-049) | v1.6.0 | 2026-03-22 | MAJOR | #inventory #procurement #po #bom #warehouse #supplier |
| CL-20260322-002 | Centralized ID Generators + Agent ID/Code + Customer ID YYMM | v1.5.3 | 2026-03-22 | MINOR | #refactor #id-generation #employee #schema |
| CL-20260322-001 | Employee Card Full Redesign + Task Board + SVG Folder Shape Fix | v1.5.2 | 2026-03-22 | MINOR | #employee #ui #card #tasks #svgshape |
| CL-20260321-007 | Employee ID v3 Format — TVS-[TYPE]-[DEPT]-[NNN] (ADR-047) | v1.5.1 | 2026-03-21 | MINOR | #employee #id-format #breaking-change |
| CL-20260321-006 | V Point Loyalty + UI Overhaul (TopBar slim, Sidebar 3-mode) | v1.5.0-pre | 2026-03-21 | MINOR | #pos #loyalty #ui #sidebar #topbar |
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

### [CL-20260322-006] v1.8.0 — Meta Ads Domain in MCP + adsOptimizeRepo Bug Fix
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #mcp #ads #marketing #bugfix #adsOptimize

#### Changes
- **`adsOptimizeRepo.js` bug fix (Critical)**: `@/lib/prisma` → `@/lib/db` import + `await getPrisma()` ทุก 9 functions (missing await ทำให้ crash ทุก DB operation)
- **`src/mcp/vschool-mcp-server.js`**: +7 tools (ads domain) — `ads.get_campaign_insights`, `ads.get_adset_insights`, `ads.get_ad_performance`, `ads.get_daily_metrics`, `ads.get_marketing_summary`, `ads.pause_resume`, `ads.set_daily_budget` — tools 15→22, version 1.6.0→1.8.0
- **`src/app/api/mcp/route.js`**: +7 tools (compact format), version 1.6.0→1.8.0

#### Verification
```bash
curl https://crmapp-pi.vercel.app/api/mcp
# → {"status":"ok","server":"vschool-crm-mcp","version":"1.8.0","tools":22,"transport":"streamable-http"}
```

---

### [CL-20260322-005] v1.7.0 — MCP Server — Dual Transport stdio + Streamable HTTP (ADR-050)
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #mcp #api #infrastructure #auth #middleware

#### Changes
- **`src/mcp/vschool-mcp-server.js`** (NEW): stdio transport, 15 tools, 5 domains (Customer/Schedule/Kitchen/Inventory/Procurement)
- **`src/app/api/mcp/route.js`** (NEW): Vercel HTTP endpoint — GET health check + POST JSON-RPC dispatch + Bearer token auth (`MCP_SECRET`)
- **middleware.js fix**: whitelist `/api/mcp` → `role: null` (เดิมตกไปที่ catch-all → 401)
- **`package.json`**: เพิ่ม `mcp:start` script (`npx tsx --tsconfig tsconfig.json`)
- **Claude Desktop config**: เขียน `claude_desktop_config.json` สำหรับ local stdio mode

#### Verification
```bash
curl https://crmapp-pi.vercel.app/api/mcp
# → {"status":"ok","server":"vschool-crm-mcp","version":"1.6.0","tools":15,"transport":"streamable-http"}
```

---

### [CL-20260322-004] v1.6.1 — Employee Card UX + Interactive Permissions + jobTitle
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #employee #ui #card #permissions #schema #bugfix

#### Changes
- **Employee Card**: FAB inside card (positive coords), shimmer effect (front card only), bg card opacity ลด (abs=1→0.35, abs=2→0.12), FAB gradient match avatar
- **"การ์ดของคุณ"**: gold top border + pill badge เมื่อ card ตรงกับ currentUser
- **Edit button**: ย้ายออกจาก Profile tab → ขวาของ tab bar (เห็นได้ทุก tab)
- **PermissionMatrix**: cells กดได้ cycle 5 states + Save บันทึกลง `app_config` table
- **`jobTitle` field**: เพิ่ม `Employee.jobTitle` แยกจาก `department` — schema, DB, API, UI ครบ
- **DB fix**: clear `facebook_url` email ออกจาก Guest+Demo records

#### Files Changed
- `src/components/EmployeeManagement.js`, `src/components/PermissionMatrix.js`
- `src/app/api/permissions/route.js` (NEW), `src/app/api/employees/route.js`, `src/app/api/employees/[id]/route.js`
- `prisma/schema.prisma`

---

### [CL-20260322-002] v1.5.3 — Centralized ID Generators + Agent ID/Code + Customer ID YYMM
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #refactor #id-generation #employee #schema

#### Changes
- **Centralized ID Generators**: รวม 20 generators จาก 14 ไฟล์ → `src/lib/idGenerators.js` ไฟล์เดียว ลบ `src/utils/idGenerator.js` + `src/lib/id-generators.js`
- **Agent ID** (`Employee.agentId`): `AGT-[TYPE]-[YYMM]-[NNN]` auto-generated (HM=Human, AI=AI)
- **Agent Code** (`Employee.agentCode`): 3-4 letter IATA-style code (unique, manual, required)
- **Customer ID**: `TVS-CUS-[CH]-[YYMM]-[XXXX]` — เพิ่มเดือนใน ID
- **Employee Form**: dropdown ประเภทการจ้าง (EMP/FL/CT) + dropdown แผนก (12 ตัวเลือก) + Agent Code input ทั้ง Add/Edit modal

#### Files Changed
- `src/lib/idGenerators.js` (NEW), `prisma/schema.prisma`, `src/app/api/employees/route.js`, `src/components/EmployeeManagement.js`, `id_standards.yaml`, + 12 consumer files updated imports

---

### [CL-20260322-001] v1.5.2 — Employee Card Full Redesign + Task Board + SVG Folder Shape Fix
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #employee #ui #card #tasks #svgshape

#### Changes
- **Task Board (TaskPanel)**: L0–L5 priority system, urgentCount sidebar badge, create/edit modal. API: `GET+POST /api/tasks`, `PATCH+DELETE /api/tasks/[id]`. `taskConstants.js` extracted to fix Vercel build error (route files cannot export non-HTTP named exports).
- **RBAC Guard + Auth**: canManage = `can(role, 'system', 'view')`. JWT auto-refresh from DB every 5 min (stale session fix). /api/employees lowered MANAGER → ADMIN. Scroll reset on view change.
- **ThumbnailStrip**: Replace DotPager + flat thumbnail row → centered wheel carousel. ResizeObserver measures width → Framer Motion spring centers active item. Active: scale 1.12, role-color glow, name label. Gold highlight ring at center.
- **Dark Glass Card**: SVG base (opacity 0.92) + role-color tint + glow border (active state). Circular avatar top-left, name/role/ID inline right. ArrowUpRight FAB in top-right corner.
- **KpiBlock**: 3-stat grid (Revenue, Customers, CloseRate) + Sparkline SVG (6-month, area fill + drop-shadow in role color).
- **StatusToggle bare**: Emerald green active / grey inactive. One-click PATCH to DB.
- **Priority bar**: Horizontal progress bar (role-color) + glowing level circle L0–L5. Renamed from "Permission".
- **Effects**: 4 animated smoke/haze divs (bottom bloom, left/right wisps, top ambient) + role-color outer glow on active card.
- **Employee ID fix**: TVS-EMP-2026-XXXX → TVS-EMP-XXXX (DB migration 4 rows + serial parser fix).
- **SVG Folder Shape**: Iterated from 50px notch → 150px → 3-cut corners (octagon) → **FINAL: 1 tab + 3 Q bezier rounded corners R=28**. Path: `M 28 0 Q 0 0 0 28 L 0 344 Q 0 372 28 372 L 344 372 Q 372 372 372 344 L 372 100 L 322 0 Z`

#### Files Changed
- `src/components/EmployeeManagement.js` — ThumbnailStrip, EmployeeCardDeck, KpiBlock, StatusToggle bare, SVG card layers
- `src/lib/taskConstants.js` — NEW
- `src/app/api/tasks/route.js`, `tasks/[id]/route.js` — NEW
- `src/lib/authOptions.js` — JWT 5-min refresh
- `src/app/api/employees/route.js` — serial parser (last segment)
- `src/components/AdminPerformance.js` — EMP ID placeholder fix

---

*Older entries available in `changelog/CL-*.md` — see Index table above*
