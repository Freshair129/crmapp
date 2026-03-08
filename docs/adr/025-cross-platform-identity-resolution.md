# ADR 025: Cross-Platform Identity Resolution & Phone Normalization

## Status
Implemented (2026-03-09)

## Context
ลูกค้า V School ติดต่อผ่านหลายช่องทาง (Facebook Messenger, LINE, Walk-in) ปัญหาที่เกิดขึ้น:

1. **PSID Fragmentation**: ลูกค้า 1 คนที่ทักหลายเพจจะได้ PSID ต่างกัน — ระบบนับเป็นคนละคน ทำให้ Conversion ซ้ำซ้อน
2. **Phone Inconsistency**: เบอร์โทรที่ได้จากแชทมีรูปแบบหลากหลาย (`081xxxxxxx`, `+6681xxxxxxx`, `6681xxxxxxx`) — ไม่สามารถ match cross-platform ได้
3. **LINE Attribution Gap**: ลูกค้าที่ปิดการขายผ่าน LINE ไม่ถูกผูกกลับ Facebook Ad — ROAS under-report (จริง 5.29x vs ระบบรายงาน 1.54x)
4. **No Global Identity**: ไม่มี UUID ที่เป็นศูนย์กลางในการผูก PSID หลายตัว

## Decision

### D1: Phone Normalization (E.164) — FR3.1
ทุกเบอร์โทรที่รับเข้าระบบต้องผ่าน `normalizePhone()` ก่อนบันทึก:
```
Input:  "081-234-5678", "6681234567", "+6681234567"
Output: "+66812345678"  (E.164 format)
```
เก็บใน `Customer.phonePrimary` เสมอ — ใช้เป็น merge key

### D2: Identity Merge via Phone (FR3.2)
เมื่อรับ Webhook ใหม่ (Facebook หรือ LINE):
```
1. Normalize phone → E.164
2. Query Customer WHERE phonePrimary = normalized_phone
3. ถ้าพบ → ผูก PSID ใหม่เข้ากับ Customer เดิม (upsert facebookId / lineId)
4. ถ้าไม่พบ → สร้าง Customer ใหม่
5. ทุก operation ต้องอยู่ใน prisma.$transaction (NFR5)
```

### D3: Global User ID
`Customer.id` (CUID) ทำหน้าที่เป็น `global_user_id` — FK สำหรับ PSID, LINE ID, Phone ทั้งหมด
ไม่สร้าง column ใหม่ — ใช้ existing `Customer.id`

### D4: LINE Conversion Attribution
เมื่อ LINE Webhook แจ้งการซื้อ:
```
LINE userId → lookup Customer by lineId
Customer.origin_id (ad_id) → ผูกกลับ Meta Campaign
บันทึก conversion event → แก้ ROAS under-report
```

### D5: Scraper Heuristic Mapping (FR3.3 — Already Working)
คง logic เดิม: `Sent by [Name]` → match กับ `id-mapping.yaml` → `agent_id`
เพิ่ม: บันทึก PSID ถาวร (FR3.4) เมื่อ match สำเร็จ

## Consequences
**Pros:**
- ลด duplicate customers
- LINE ROAS attribution แก้ช่องว่าง 5.29x vs 1.54x
- Phone เป็น universal merge key ข้ามทุก channel

**Cons:**
- ต้องเพิ่ม `lineId` column ใน Customer (migration)
- `normalizePhone()` ต้องรองรับ edge cases (เบอร์ต่างประเทศ, เบอร์บ้าน)

**Risk:**
- Phone อาจซ้ำกัน (ครอบครัวใช้เบอร์เดียวกัน) — ต้องมี manual override
- LINE Webhook signature verification เพิ่ม complexity
