# ADR-050: MCP Server — Dual Transport (stdio + Streamable HTTP)

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Boss + Claude
**Version:** v1.8.0 (updated from v1.7.0)

---

## Context

V School CRM มี data domains ที่มีคุณค่าสำหรับการ query ผ่าน AI assistant:
- Customer search (ชื่อ / โทรศัพท์ / tier)
- Schedule lookup (upcoming classes, cohorts)
- Kitchen stock + expiring lots
- Inventory stock levels + alerts
- Procurement BOM + PO status

ก่อนหน้านี้ทุก query ต้องผ่าน CRM UI หรือ direct DB access เท่านั้น ทำให้ยากต่อการให้ Claude หรือ AI tool อื่นๆ access ข้อมูลแบบ structured โดยตรง

**Model Context Protocol (MCP)** คือ standard ที่ Anthropic ออกแบบให้ AI assistant เชื่อมต่อกับ external tools/data ผ่าน JSON-RPC เพื่อ call functions แบบ type-safe พร้อม schema validation

---

## Decision

สร้าง MCP server แบบ **dual transport** เพื่อรองรับทั้ง local development และ production:

### Transport 1: stdio (Local Claude Desktop)
- **ไฟล์:** `src/mcp/vschool-mcp-server.js`
- **ใช้งาน:** Claude Desktop config → `mcpServers` → spawn process ผ่าน `npx tsx --tsconfig`
- **เหมาะกับ:** Boss ใช้ query ข้อมูลจาก Claude Desktop โดยตรง

### Transport 2: Streamable HTTP (Vercel Production)
- **ไฟล์:** `src/app/api/mcp/route.js`
- **ใช้งาน:** HTTP GET (health) + HTTP POST (JSON-RPC dispatch)
- **Auth:** Bearer token via `MCP_SECRET` env var (optional — ถ้าไม่ตั้งจะ public)
- **เหมาะกับ:** remote access, CI/CD scripts, future agent integrations

### Tools (22 tools, 6 domains)

| Domain | Tool | Description | Write? |
|---|---|---|---|
| Customer | `customer.search` | ค้นหาลูกค้าด้วยชื่อ/โทรศัพท์/ID | |
| Schedule | `schedule.list_upcoming` | ตารางคลาสในช่วงกี่วันข้างหน้า | |
| Schedule | `schedule.get_by_class` | ดูคลาสทั้งหมดในกลุ่ม classId เดียวกัน | |
| Kitchen | `kitchen.check_stock` | ดู stock วัตถุดิบ (พร้อม low-stock filter) | |
| Kitchen | `kitchen.get_expiring_lots` | วัตถุดิบที่ใกล้หมดอายุ | |
| Inventory | `inventory.stock_levels` | stock ทุก warehouse | |
| Inventory | `inventory.low_stock_alerts` | alerts จาก threshold | |
| Inventory | `inventory.list_warehouses` | รายชื่อ warehouses | |
| Procurement | `procurement.calculate_bom` | คำนวณ BOM จาก classId | |
| Procurement | `procurement.create_po_from_bom` | สร้าง PO จาก BOM shortfall | ⚠️ |
| Procurement | `procurement.get_po` | ดู PO รายใบ | |
| Procurement | `procurement.list_pos` | ดู PO list พร้อม filter | |
| Procurement | `procurement.list_suppliers` | รายชื่อ suppliers | |
| Procurement | `procurement.pending_advances` | advances ที่ยังรอ settle | |
| Procurement | `procurement.approve_po` | อนุมัติ PO | ⚠️ |
| Meta Ads | `ads.get_campaign_insights` | spend/ROAS/CTR ต่อ campaign, filter ตาม range | |
| Meta Ads | `ads.get_adset_insights` | performance แยกตาม adset | |
| Meta Ads | `ads.get_ad_performance` | performance ระดับ ad รายชิ้น | |
| Meta Ads | `ads.get_daily_metrics` | daily trend ย้อนหลัง (spend/CTR/ROAS ต่อวัน) | |
| Meta Ads | `ads.get_marketing_summary` | ภาพรวม 30d + all-time | |
| Meta Ads | `ads.pause_resume` | pause/resume campaign/adset/ad บน Meta | ⚠️ |
| Meta Ads | `ads.set_daily_budget` | ปรับ daily budget adset (บาท) | ⚠️ |

**range parameter** (Meta Ads tools): `today` / `last_7d` / `last_30d` / `this_month` / `last_month` / (ไม่ส่ง = all time)

---

## Alternatives Considered

### Option A: REST API only (ไม่ทำ MCP)
- **ข้อเสีย:** Claude ต้องเรียก API ผ่าน Claude in Chrome หรือ tools/fetch — ไม่ structured, ไม่ type-safe
- **ข้อดี:** ไม่ต้องเพิ่ม dependency

### Option B: OpenAPI + function calling
- **ข้อเสีย:** ต้อง maintain spec แยก, ไม่ native กับ Claude Desktop
- **ข้อดี:** compatible กับ OpenAI ecosystem

### Option C: MCP stdio only (ไม่มี HTTP)
- **ข้อเสีย:** ทำงานได้เฉพาะ local — ไม่สามารถ share ให้ทีมหรือ deploy บน remote ได้

**เลือก Dual Transport** เพราะให้ flexibility ทั้ง local (Boss) และ remote (team/automation) โดยไม่เพิ่ม complexity มาก

---

## Consequences

### Positive
- Claude Desktop สามารถ query CRM data ได้โดยตรง โดยไม่ต้อง login ผ่าน browser
- MCP tools สามารถเพิ่มได้ง่ายโดยลง field descriptor + handler ใน `TOOLS` array
- HTTP endpoint รองรับ future MCP client อื่นๆ (Cursor, Windsurf, etc.)

### Negative / Gotchas
- ⚠️ **MCP_SECRET**: ถ้าตั้ง env var นี้ ทุก POST ต้องมี `Authorization: Bearer <secret>` — ถ้าไม่มีจะได้ 401
- ⚠️ **Local stdio + path alias**: ต้องใช้ `npx tsx --tsconfig tsconfig.json` เสมอ — `@/` aliases ไม่ resolve โดยอัตโนมัติใน standalone Node.js
- ⚠️ **module boundary**: อย่าสร้าง `src/mcp/package.json` ที่มี `"type":"module"` — จะทำให้ CJS/ESM boundary แตกกับ `src/lib/*.js` ที่ใช้ CJS
- ⚠️ **Write tools**: `procurement.approve_po` เป็น write operation — ควรเพิ่ม confirmation step ใน future iteration

### Neutral
- Middleware whitelist: `/api/mcp` ต้องอยู่ใน `ROUTE_ROLES` ด้วย `role: null` เพื่อ bypass session guard (Bearer token handles auth internally)

---

## Implementation

### Key Files

| File | Role |
|---|---|
| `src/mcp/vschool-mcp-server.js` | stdio transport entry point |
| `src/app/api/mcp/route.js` | Vercel HTTP endpoint (GET + POST) |
| `src/middleware.js` | whitelist `/api/mcp` route |
| `package.json` | `mcp:start` script |
| Claude Desktop config | `~/Library/Application Support/Claude/claude_desktop_config.json` |

### Claude Desktop Config

```json
{
  "mcpServers": {
    "vschool-crm": {
      "command": "npx",
      "args": [
        "tsx",
        "--tsconfig", "/Users/ideab/Desktop/crm/tsconfig.json",
        "/Users/ideab/Desktop/crm/src/mcp/vschool-mcp-server.js"
      ],
      "cwd": "/Users/ideab/Desktop/crm"
    }
  }
}
```

### Production Health Check

```bash
# GET — no auth required
curl https://crmapp-pi.vercel.app/api/mcp
# → {"status":"ok","server":"vschool-crm-mcp","version":"1.8.0","tools":22,"transport":"streamable-http"}

# POST with Bearer auth (if MCP_SECRET set)
curl -X POST https://crmapp-pi.vercel.app/api/mcp \
  -H "Authorization: Bearer <secret>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| v1.7.0 | 2026-03-22 | Initial — 15 tools, 5 domains, dual transport, middleware fix |
| v1.8.0 | 2026-03-22 | +7 Meta Ads tools (22 total), adsOptimizeRepo bug fix (await getPrisma) |

---

## Future Work

- Remote MCP config สำหรับ Claude Desktop (HTTP transport แทน stdio)
- Rate limiting บน POST endpoint
- Tool-level permission (บาง tool เฉพาะ MARKETING+ เท่านั้น)
- `ads.get_pending_requests` — ดู lifetime budget requests รอ approve
