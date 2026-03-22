**LATEST:** CL-20260323-003 | v1.9.3 | 2026-03-23

---

## 📋 Index (older entries)

| ID | Name | Version | Date | Severity | Tags |
|---|---|---|---|---|---|
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

### [CL-20260323-001] v1.9.1 — Multi-Role RBAC + OWNER Role + Employee DB Cleanup (Phase 34)
**Date:** 2026-03-23 | **Severity:** MINOR | **Tags:** #rbac #multi-role #employee #db-migration

#### Changes
- **`Employee.roles String[]`**: multi-role array, additive permission union
- **`rbac.js`**: OWNER role (L4.5), `getMaxRoleLevel()`, `hasMultiRolePermission()`
- **`authOptions.js`**: JWT/session expose `roles[]`, fallback `[role]` if empty
- **`sidebarProfiles.js`**: OWNER executive profile, `canSeeItem(string|string[])`, `getAllowedItems()`
- **Supabase**: ADD COLUMN roles TEXT[], migrate existing, fix employee IDs/emails/INACTIVE
- **คุณวอเตอร์ (เชฟคานิ)**: name → วอลเตอร์ ลี, role → OWNER

---

### [CL-20260322-008] v1.9.0 — NotebookLM Chat Intelligence + Knowledge Tree
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #ai #intelligence #notebooklm #mermaid

#### Changes
- **Daily Intelligence**: engine สรุป conversation + generate Mermaid.js "Knowledge Tree"
- **`intelligenceRepo.js`** (new): generateDailyIntelligence(), getIntelligenceByConversation(), getRecentIntelligence()
- **`ConversationIntelligence` model**: dailySummary, mermaidTree, generatedAt, conversationId FK
- **MCP Tool**: v1.9.0 + `intelligence.get_chat_tree` tool (tools 22→23)

---

### [CL-20260322-007] v1.8.1 — Audit & MCP Core Implementation
**Date:** 2026-03-22 | **Severity:** MINOR | **Tags:** #docs #audit #mcp #procurement

#### Changes
- **PRD Audit**: `system_requirements.yaml` อัปเดตเป็น v1.5.3 ครอบคลุม modules 18-24
- **API Ref Sync**: เขียนใหม่ `docs/API_REFERENCE.md` ให้ตรงกับ repository-backed endpoints ปัจจุบัน
- **MCP Server**: `src/mcp/vschool-mcp-server.js` เพิ่ม Procurement domain tools
- **ADR-050**: Formalized AI-Native Operations via MCP

---

*Older entries available in `changelog/CL-*.md` — see Index table above*
