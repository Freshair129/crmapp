# ADR 027: Database Schema Initialization — Prisma Schema v1

## Status
Accepted (2026-03-08)

## Context
Phase 1 ของ CRM v2 Greenfield Rewrite กำหนดให้สร้าง `prisma/schema.prisma` ใหม่ทั้งหมดจาก
`system_requirements.yaml` และ `id_standards.yaml` เป็น Source of Truth
โดยมี Gemini CLI เป็น sub-agent ร่างต้นฉบับ และ Claude (Lead Architect) ทำ review + save

## Decisions

### D1: UUID แทน CUID
ใช้ `@default(uuid())` บน Primary Key ทุก model

**เหตุผล:**
- `id_standards.yaml` กำหนด `global_user_id`, `agent_id` เป็น UUID
- UUID เป็น standard ที่ interoperable ข้าม system ได้ (ไม่ผูกกับ Prisma CUID library)
- Predictable format สำหรับ external integrations (Meta API, LINE API)

**Trade-off:** CUID สั้นกว่าและ collision-resistant เท่ากัน แต่ UUID เป็น database-agnostic มากกว่า

---

### D2: Bottom-Up Aggregation — Campaign ไม่เก็บ Metrics (ADR-024)
`Campaign` model ไม่มี fields `spend`, `impressions`, `clicks`, `leads`, `purchases`, `revenue`, `roas`

**เหตุผล:**
- ตาม ADR-024 D2: ตัวเลข L3 (Campaign) คำนวณ Bottom-Up จาก Ad → AdSet → Campaign ใน application layer
- เก็บไว้ใน DB จะทำให้ข้อมูลไม่ consistent กับ Checksum Rule (ADR-024 D3)
- Meta API ส่ง Campaign totals ที่อาจต่างจาก Sum(Ads) ด้วย rounding (±1%)

**Consequence:** Application layer ต้องคำนวณ Campaign metrics ทุกครั้ง — อาจช้าลงเล็กน้อยแต่ถูกต้องกว่า

---

### D3: AdHourlyLedger — Append-Only Trend Log (ADR-024 D4)
เพิ่ม model `AdHourlyLedger` แยกจาก `AdHourlyMetric`

| Model | วัตถุประสงค์ | การเขียน |
|---|---|---|
| `AdHourlyMetric` | Snapshot ล่าสุด | UPDATE (overwrite) |
| `AdHourlyLedger` | Historical trend log | INSERT only (append) |

**Delta Rule:** เขียน `AdHourlyLedger` เฉพาะเมื่อ `delta(spend/impressions) != 0`
**Index:** `(adId, date, hour)` — ไม่ unique เพราะ append-only รองรับ multiple entries ต่อ hour

---

### D4: Customer.originId — Source Attribution (ADR-025)
เพิ่ม `originId String? @map("origin_id")` ใน Customer

**เหตุผล:**
- `id_standards.yaml` กำหนด `origin_id` เป็น "ID ของแหล่งที่มา (Source Attribution)"
- ใช้เก็บ `ad_id`, `post_id`, `qr_code_id`, หรือ `lead_form_id` ที่นำลูกค้าเข้าระบบครั้งแรก
- ADR-025 D4: LINE Conversion Attribution — `Customer.originId (ad_id)` ผูกกลับ Meta Campaign
- แก้ปัญหา ROAS under-report (จริง 5.29x vs ระบบรายงาน 1.54x)

---

### D5: Employee.role RBAC Default (ADR-026)
`Employee.role` ใช้ `@default("AGENT")` — ค่า default ที่ปลอดภัยที่สุด

**Role Hierarchy (ADR-026 D1):**
```
Developer > Manager > Supervisor > Admin > Agent > Guest
```
Default = `AGENT` → access ขั้นต่ำ (เห็น chat ของตัวเองเท่านั้น)
การ assign role สูงกว่าต้องทำโดย Developer/Manager เท่านั้น

---

### D6: Product.linkedMenuIds — Course-to-Menu Link (id_standards)
เพิ่ม fields ต่อไปนี้ใน `Product`:
- `linkedMenuIds String[]` — รายการ Menu IDs ที่สอนในคอร์ส (e.g., `["THMDH-N001", "JPAP-C-N002"]`)
- `fallbackCategory String?` — สัญชาติอาหาร (e.g., `"JP"`, `"TH"`) เมื่อ Menu ID ไม่พร้อม
- `fallbackSubCategory String?` — ประเภทครัว (e.g., `"H"` = Hot Kitchen, `"C"` = Cold Kitchen)

**Dependency Fallback Strategy** ตาม `id_standards.yaml`:
1. Exact Menu ID → 2. Sub-Category → 3. Category → 4. UNKNOWN (Alert Admin)

---

### D7: Named Relations
ใช้ named relations เพื่อแก้ ambiguous relation errors ใน Prisma:

| Relation Name | From | To |
|---|---|---|
| `OrderCloser` | `Order.closedBy` | `Employee` |
| `ConversationAssignee` | `Conversation.assignedEmployee` | `Employee` |
| `MessageResponder` | `Message.responder` | `Employee` |
| `OrderConversation` | `Order.conversation` | `Conversation` |
| `AgentTasks` | `Task.assignee` | `Employee` |

---

### D8: Employee — Unified Identity Store
`Employee.identities Json?` เก็บ external identity mapping แบบ unified:
```json
{
  "facebook": { "psid": "...", "name": "Aoi" },
  "line": { "id": "..." }
}
```
แทนที่จะเป็น individual columns (`facebookPsid`, `lineName`) เพื่อ extensibility

## Consequences

**Pros:**
- Schema ตรงตาม `system_requirements.yaml` + `id_standards.yaml` ทุก constraint
- 23 models ครอบคลุมทุก domain: Customer, Conversation, Marketing, Employee, Product, Audit
- ADR-024/025/026 สะท้อนอยู่ใน schema โดยตรง
- Clean naming — ทุก field มี `@map("snake_case")` และทุก model มี `@@map("table_name")`

**Cons:**
- Migration จาก existing schema ต้องระวัง column renames (`employeeCode` → `employee_id`)
- `Campaign` ไม่มี cached metrics → aggregation ทุก request (ยอมรับได้สำหรับ scale ปัจจุบัน)

**Next Steps:**
- Phase 2: `normalizePhone()` + LINE attribution webhook (ADR-025)
- Phase 5: `AdHourlyLedger` writer + Bottom-Up aggregator (ADR-024)
- Phase 7: `requireRole()` middleware + RBAC enforcement (ADR-026)
