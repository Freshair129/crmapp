**LATEST:** CL-20260323-007 | v2.1.0 | 2026-03-23

---

## 📋 Index (older entries)

| ID | Name | Version | Date | Severity | Tags |
|---|---|---|---|---|---|
| CL-20260323-007 | Notion DB Schema + notionRepo Full Sync (Task Type/Time/Milestones) | v2.1.0 | 2026-03-23 | MINOR | #notion #sync #task-type #schema |
| CL-20260323-006 | Task Type System — SINGLE/RANGE/PROJECT + CODEBASE_MAP | v2.1.0 | 2026-03-23 | MINOR | #tasks #calendar #ui #codebase-map |
| CL-20260323-005 | Phase 36 RBAC Redesign: 12 New Roles + Employee Grade | v2.0.0 | 2026-03-23 | BREAKING | #rbac #roles #permissions #employee #grade #breaking |
| CL-20260323-004 | Employee Card Framer Motion Animations + Overview StatCards | v1.9.4 | 2026-03-23 | MINOR | #ui #employee #animation #framer-motion #overview #stats |
| CL-20260322-008 | NotebookLM Chat Intelligence + Knowledge Tree | v1.9.0 | 2026-03-22 | MINOR | #ai #intelligence #notebooklm |
| CL-20260322-007 | Audit & MCP Core Implementation | v1.8.1 | 2026-03-22 | MINOR | #docs #audit #mcp #procurement |
| CL-20260322-006 | Meta Ads Domain in MCP (v1.8.0) + adsOptimizeRepo Bug Fix | v1.8.0 | 2026-03-22 | MINOR | #mcp #ads #marketing #bugfix |
| CL-20260322-005 | MCP Server v1.7.0 — Dual Transport stdio + Streamable HTTP (ADR-050) | v1.7.0 | 2026-03-22 | MINOR | #mcp #api #infrastructure #auth #middleware |
| CL-20260322-004 | Employee Card UX + Interactive Permissions + jobTitle | v1.6.1 | 2026-03-22 | MINOR | #employee #ui #card #permissions #schema |
| CL-20260322-003 | Inventory Control + Procurement PO Lifecycle (ADR-048, ADR-049) | v1.6.0 | 2026-03-22 | MAJOR | #inventory #procurement #po #bom #warehouse #supplier |
| CL-20260322-002 | Centralized ID Generators + Agent ID/Code + Customer ID YYMM | v1.5.3 | 2026-03-22 | MINOR | #refactor #id-generation #employee #schema |
| CL-20260322-001 | Employee Card Full Redesign + Task Board + SVG Folder Shape Fix | v1.5.2 | 2026-03-22 | MINOR | #employee #ui #card #tasks #svgshape |
| CL-20260321-007 | Employee ID v3 Format — TVS-[TYPE]-[DEPT]-[NNN] (ADR-047) | v1.5.1 | 2026-03-21 | MINOR | #employee #id-format #breaking-change |
| CL-20260321-006 | V Point Loyalty + UI Overhaul (TopBar slim, Sidebar 3-mode) | v1.5.0-pre | 2026-03-21 | MINOR | #pos #loyalty #ui #sidebar #topbar |
| CL-20260321-005 | Admin Performance Fix (Monthly Message Trend) | v1.4.1 | 2026-03-21 | PATCH | #bugfix #analytics #dashboard |
| CL-20260321-003 | RBAC Redesign + Ads Optimize (ADR-045) | v1.4.0 | 2026-03-21 | MINOR | #rbac #marketing #ads #roles |
| CL-20260321-002 | Web Push Inbox Real-time (ADR-044) | v1.3.0 | 2026-03-21 | MINOR | #inbox #push #realtime |
| CL-20260321-001 | Equipment Domain POS + Spec Fields | v1.2.0 | 2026-03-21 | MINOR | #pos #equipment #ui |
| CL-20260319-006 | POS Modal + Sheet ID Generation | v1.1.0 | 2026-03-19 | MINOR | #pos #sheets #id-generation |
| CL-20260319-005 | Production Ready (Phase 28 — ADR-041) | v1.0.0 | 2026-03-19 | MINOR | #documentation #v1 #production |
| CL-20260319-004 | Upstash Infrastructure Migration | v0.27.0 | 2026-03-19 | MINOR | #infrastructure #upstash #qstash |
| CL-20260319-003 | Chat-First Revenue Attribution | v0.26.0 | 2026-03-19 | MINOR | #revenue #attribution #ocr |
| CL-20260319-002 | Production Hardening Complete | v0.25.0 | 2026-03-19 | MINOR | #security #reliability #production |
| CL-20260319-001 | Comprehensive Unit Test Expansion | v0.24.0 | 2026-03-19 | MINOR | #testing #quality |
| CL-20260318-002 | Repository Layer Full Compliance | v0.23.0 | 2026-03-18 | MINOR | #repository #refactor |
| CL-20260318-001 | FEFO Stock Deduction Refinement | v0.22.0 | 2026-03-18 | MINOR | #kitchen #repository |
| CL-20260317-002 | Bug Audit + Repo Refactor | v0.21.0 | 2026-03-17 | PATCH | #bugfix #repository |
| CL-20260316-001 | Lot ID + Class ID | v0.20.0 | 2026-03-16 | MINOR | #schema #kitchen |
| CL-20260315-001 | Schema Hardening | v0.19.0 | 2026-03-15 | PATCH | #schema #prisma |

---

## 📝 Recent (last 5 — full content)

### [CL-20260323-007] v2.1.0 — Notion DB Schema + notionRepo Full Sync (Task Type/Time/Milestones)
**Date:** 2026-03-23 | **Severity:** MINOR | **Tags:** #notion #sync #task-type #schema #bugfix

#### Changes
- **Notion DB** (via MCP): renamed `Task Name`→`Task`, `Assigned To`→`Assignee` (fix push mismatch); Priority options aligned (L2·Important, L3·Routine, L5·Optional); Status `🟠 Pending`→`🟠 Urgent`, added `⏸ On Hold`; new columns: Task Type (select), Start Date (date), Time (text), Milestones (text)
- **notionRepo.js**: TASK_TYPE_TO/FROM_NOTION mapping; push taskType/startDate/timeStart/timeEnd/milestones text summary; pull reads taskType/startDate/timeStart/timeEnd; STATUS_FROM_NOTION `⏸ On Hold`→`CANCELLED`, legacy labels kept as fallback; PRIORITY_FROM_NOTION added L5 + legacy fallbacks

#### Known Gotchas
- Milestones push เป็น plain text ใน Notion — pull กลับมาจะไม่ restore milestones JSON (set null)
- ต้องเช็ก column names ทุกครั้งที่ migrate Notion workspace ใหม่

---

### [CL-20260323-006] v2.1.0 — Task Type System: SINGLE/RANGE/PROJECT + CODEBASE_MAP
**Date:** 2026-03-23 | **Severity:** MINOR | **Tags:** #tasks #calendar #weekly #ui #notion #schema #codebase-map

#### Changes
- **prisma/schema.prisma**: Task model เพิ่ม taskType/startDate/timeStart/timeEnd/milestones(Json)/completedAt/notionId
- **Supabase DB migration**: ALTER TABLE tasks ADD 6 new columns
- **TaskPanel.js** (909→1225 lines): TASK_TYPE_CONFIG (SINGLE/RANGE/PROJECT), MILESTONE_TYPES (brief/review/meeting/submit/other), taskSpansDay(); TaskModal 3-type selector + time picker (HH:MM) + range date picker + milestone editor; TaskCard แสดง time badge/range arrows/milestone count; WeeklyView colored spanning bars; CalendarView color bars + ◆ milestone markers + richer selected-day panel
- **API routes** (POST/PATCH): รับ taskType/startDate/timeStart/timeEnd/milestones fields
- **CODEBASE_MAP.yaml**: 11-domain cold-start map ใหม่ สำหรับ agent orientation

#### Known Gotchas
- WeeklyView spanning bars ใช้ `-ml-2` bleed trick — เห็น gap เล็กน้อยระหว่าง cells เป็น CSS grid limitation
- taskSpansDay() เปรียบเทียบ ISO date string — timezone offset อาจทำให้ first/last day off by 1

---

### [CL-20260323-005] v2.0.0 — Phase 36 RBAC Redesign: 12 New Roles + Employee Grade
**Date:** 2026-03-23 | **Severity:** BREAKING | **Tags:** #rbac #roles #permissions #employee #grade #breaking

#### Changes
- **permissionMatrix.js**: Complete rewrite — 12 roles × 7 domains × 6 actions, F/A/R/N levels
- **rbac.js**: New ROLE_HIERARCHY (DEV=5, MGR=4 … STF=0.5), VALID_ROLES 12 ตัว
- **sidebarProfiles.js**: SIDEBAR_PROFILES mapping all 12 roles to sidebar items
- **EmployeeManagement.js**: ROLE_META + levelNum field, GRADE_META S/A/B/C/D, grade picker, level bar fix
- **PermissionMatrix.js**: targetRole prop + useEffect sync
- **DB migration**: 32 employees → new role codes (DEVELOPER→DEV, HEAD_CHEF→PD ฯลฯ)
- **DB corrections**: บอล→PUR, ประชัน/หลิว/แป้ง→STF, Fafah→SLS
- **Bug fixes bundled**: profilePicture Prisma field, permissions route import, FB autofill, grade popup error

#### Known Gotchas
- ต้อง rotate NEXTAUTH_SECRET ใน Vercel เพื่อ invalidate session เก่า
- Multi-role assign ยังต้องใช้ SQL ตรง — ไม่มี UI

---

### [CL-20260323-004] v1.9.4 — Employee Card Framer Motion Animations + Overview StatCards
**Date:** 2026-03-23 | **Severity:** MINOR | **Tags:** #ui #employee #animation #framer-motion #overview #stats

#### Changes
- **`useCountUp(target, duration)`**: custom hook rAF + ease-out cubic — reset ทุกครั้งที่ target เปลี่ยน
- **`AnimatedMetricValue`**: parse `฿12k / 72% / 5` → animate numeric part → re-format
- **`AnimatedBar`**: `motion.div` width 0→`${norm}%` + glow + stagger delay
- **ScoreRing**: `motion.circle` pathLength 0→`score/100`, duration 0.9s
- **Sparkline**: `motion.path` pathLength 0→1 (line), area fade delay 0.8s, end-dot scale delay 1.1s
- **Bug fix — animation retrigger**: `MiniDashboard` wrapper watches `isActive` → increments `animKey` → `MiniDashboardContent key={animKey}` remounts ทุกครั้งที่สลับการ์ด
- **`StatCard`**: `rawValue` + `format` props ใหม่ — `useCountUp` internally สำหรับ count-up display
- **Overview SALES/ADMIN**: ลูกค้าที่ดูแล + ยอดสะสม + %ปิดการขาย (validSales/assigned×100) พร้อม count-up

---

### [CL-20260323-003] v1.9.3 — Ingredient Yield Percent — Kitchen Prep Waste Tracking
**Date:** 2026-03-23 | **Severity:** MINOR | **Tags:** #schema #kitchen #repository #api #ui

#### Changes
- **Schema**: `yieldPercent Float @default(100)` บน `Ingredient` — Supabase migration applied
- **`kitchenRepo.calculateStockNeeded`**: สูตรใหม่ `qtyNeeded = qtyPerPerson × students × (100 / yieldPercent)` — คิด gross purchase qty รวม prep waste
- **API `PATCH /api/kitchen/ingredients/[id]`**: validate yieldPercent 1–100 (400 ถ้าออกนอกช่วง)
- **`KitchenStockPanel`**: คอลัมน์ `YIELD %` ใหม่ — badge สี (🟢≥90 / 🟡70-89 / 🔴<70) + inline click-to-edit + field ในฟอร์ม Add Ingredient

---

### [CL-20260323-002] v1.9.2 — Audit Log Full Implementation (Phase 34.5)
**Date:** 2026-03-23 | **Severity:** MINOR | **Tags:** #audit #security #login #approval

#### Changes
- **AuditLog model**: actorId, actorEmail, approverId, approvedAt, action, entity, entityId, before, after, status (DONE/PENDING_APPROVAL/APPROVED/REJECTED), note, ip, userAgent
- **`auditRepo.js`** (new): logAction, getPendingApprovals, approveAction, rejectAction, getAuditTrail, getActorHistory, getAuditLogs
- **`authOptions.js`**: LOGIN_SUCCESS + LOGIN_FAILED (3 cases) logged via logAction
- **`employees/[id]/route.js`**: ROLE_CHANGE + EMPLOYEE_DEACTIVATE hooks
- **`/api/audit` + `/api/audit/[auditId]`** (new): list, single, approve/reject endpoints
- **`generateAuditId()`**: AUD-YYYYMMDD-NNNN format

---

### [CL-20260322-008] v1.9.0 — NotebookLM Chat Intelligence + Knowledge Tree
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #ai #intelligence #notebooklm #mermaid

#### Changes
- **Daily Intelligence**: engine สรุป conversation + generate Mermaid.js "Knowledge Tree"
- **`intelligenceRepo.js`** (new): generateDailyIntelligence(), getIntelligenceByConversation(), getRecentIntelligence()
- **`ConversationIntelligence` model**: dailySummary, mermaidTree, generatedAt, conversationId FK
- **MCP Tool**: v1.9.0 + `intelligence.get_chat_tree` tool (tools 22→23)

---

*Older entries available in `changelog/CL-*.md` — see Index table above*
