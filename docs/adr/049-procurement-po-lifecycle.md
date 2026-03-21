# ADR-049: Procurement PO Lifecycle — Chef Approval + Purchasing Flow

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Boss + Claude

## Context

เมื่อมีคลาสเรียน (ClassId) ที่ confirmed แล้ว ต้องการระบบจัดซื้อวัตถุดิบอัตโนมัติ:
- คำนวณ BOM จาก Course → Recipe → Ingredient × จำนวนนักเรียน
- เชฟเจ้าของคลาสต้อง approve ทุกครั้ง
- ฝ่ายจัดซื้อรับ PO + ระบุวันสั่ง/วันส่ง
- ติดตามขนส่ง + รับของ + จัดการปัญหา/คืนของ/วอยเงินคืน
- รองรับเงินทดรองจ่าย (ออกเงินส่วนตัวซื้อก่อน)

## Decision

### PO Status Flow

```
DRAFT → REQUEST_REVIEW → ┬─ APPROVED → ORDERING → ORDERED → RECEIVING
                          │                                      │
                          └─ REJECTED (ตีกลับ → แก้ไข → DRAFT)  ├─ RECEIVED → CLOSED
                                                                 ├─ PARTIAL (รับบางส่วน)
                                                                 └─ ISSUE (มีปัญหา)
                                                                      ├─ RETURN (ตีกลับของ)
                                                                      └─ CREDIT NOTE (วอยคืน)
```

### 10 New Models

| Model | ID Format | หน้าที่ |
|-------|-----------|---------|
| Supplier | SUP-NNN | ซัพพลายเออร์ master data |
| PurchaseOrderV2 | PO-YYYYMMDD-NNN | ใบสั่งซื้อหลัก (status machine) |
| POItem | — (UUID) | รายการวัตถุดิบใน PO |
| POApproval | APV-YYYYMMDD-NNN | บันทึกอนุมัติ/ตีกลับ (เชฟ) |
| POAcceptance | ACC-YYYYMMDD-NNN | ฝ่ายจัดซื้อรับ PO |
| POTracking | TRK-YYYYMMDD-NNN | ติดตามขนส่ง |
| GoodsReceivedNote | GRN-YYYYMMDD-NNN | ใบรับของ |
| GRNItem | — (UUID) | รายการของที่รับ |
| POReturn | RTN-YYYYMMDD-NNN | ตีกลับสินค้า |
| CreditNote | CN-YYYYMMDD-NNN | วอยเงินคืน |
| POIssue | ISS-YYYYMMDD-NNN | บันทึกปัญหา |
| Advance | ADV-YYYYMMDD-NNN | เงินทดรองจ่าย |

### Key Decisions

1. **PurchaseOrderV2** — ใช้ V2 เพราะมี PurchaseRequest (Phase 15) อยู่แล้ว ซึ่งเป็น simple model สำหรับ kitchen auto-generate ตัวใหม่เป็น full lifecycle
2. **Chef must approve** — ทุก PO ต้องผ่านเชฟเจ้าของ classId ก่อน ฝ่ายจัดซื้อถึงจะเห็น
3. **Advance model** — รองรับทั้งเบิกเงินล่วงหน้าและออกเงินส่วนตัว โดย link กลับไปที่ PO (optional)
4. **GRN → Lot** — เมื่อรับของแล้ว auto-create IngredientLot (LOT-YYYYMMDD-NNN) + update Ingredient.currentStock
5. **Issue escalation** — ปัญหาสามารถ resolve ด้วย Return หรือ CreditNote หรือทั้งคู่

### Triggers

| Event | Trigger |
|-------|---------|
| Class confirmed (classId assigned) | ระบบคำนวณ BOM → สร้าง PO (DRAFT) |
| Chef clicks approve | PO → APPROVED, สร้าง APV record |
| Chef clicks reject | PO → REJECTED, สร้าง APV record with reason |
| ฝ่ายจัดซื้อ accepts PO | PO → ORDERING, สร้าง ACC record |
| สั่งซื้อเสร็จ | PO → ORDERED, บันทึก supplier + invoice ref |
| มี tracking | สร้าง TRK record |
| รับของ | สร้าง GRN + GRNItem + IngredientLot |
| มีปัญหา | สร้าง ISS record, PO → ISSUE |
| ตีกลับของ | สร้าง RTN record |
| วอยเงินคืน | สร้าง CN record |
| เบิกเงิน | สร้าง ADV record |

## Consequences

### Positive
- Full audit trail ทุกขั้นตอน — ใครทำอะไรเมื่อไหร่
- เชฟควบคุมวัตถุดิบได้ 100% — ไม่มี PO ผ่านโดยไม่ได้ approve
- ฝ่ายจัดซื้อมี workflow ชัดเจน
- รองรับ partial delivery + issue management

### Negative
- Schema ใหญ่ขึ้น 12 models
- Workflow ซับซ้อน — ต้อง train พนักงาน
- PurchaseRequest (Phase 15) ยังอยู่ — อาจสับสนกับ PO V2

### Migration
- PurchaseRequest เดิม (Phase 15) ยังใช้ได้สำหรับ simple auto-generate จาก session complete
- PurchaseOrderV2 ใช้สำหรับ full procurement lifecycle
- ทั้งสองอยู่ร่วมกันได้ — PurchaseRequest = simple, PurchaseOrderV2 = full flow
