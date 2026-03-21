# Procurement Domain — V School CRM

> Reference document สำหรับระบบจัดซื้อวัตถุดิบ (Procurement) ของ The V School
> ADR: [ADR-049](../adr/049-procurement-po-lifecycle.md)
> Date: 2026-03-22

---

## 1. Domain Overview

ระบบจัดซื้อ (Procurement) ครอบคลุม lifecycle ทั้งหมดตั้งแต่คลาสเรียน confirmed จนถึงรับของเข้าสต็อก:

1. **BOM Calculation** — คำนวณวัตถุดิบที่ต้องใช้จาก Course → Recipe → Ingredient
2. **PO Creation** — สร้างใบสั่งซื้อ (Purchase Order) อัตโนมัติจาก BOM shortfall
3. **Chef Approval** — เชฟเจ้าของคลาส approve/reject PO
4. **Purchasing Flow** — ฝ่ายจัดซื้อรับ PO → สั่งซื้อ → ติดตาม → รับของ
5. **Issue Management** — จัดการปัญหา: ตีกลับของ, วอยเงินคืน
6. **Advance** — เงินทดรองจ่าย / ออกเงินส่วนตัวซื้อก่อน

### ความแตกต่างจาก PurchaseRequest (Phase 15)

| | PurchaseRequest (Phase 15) | PurchaseOrderV2 (Procurement) |
|---|---|---|
| ใช้เมื่อ | Session complete → auto-generate | Class confirmed → full lifecycle |
| Status | Simple (PENDING/APPROVED/ORDERED) | 10+ statuses with state machine |
| Approval | ไม่มี | Chef must approve |
| Tracking | ไม่มี | Full tracking + GRN |
| Issue mgmt | ไม่มี | Return + CreditNote |
| Coexistence | ยังใช้ได้ | Full flow สำหรับ procurement ใหม่ |

---

## 2. Entity Relationship

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PROCUREMENT DOMAIN                           │
│                                                                     │
│  ┌─────────────┐                                                    │
│  │  Supplier    │ SUP-NNN                                           │
│  │  (master)    │◄────────────────────────────┐                     │
│  └─────────────┘                              │                     │
│                                               │                     │
│  ┌──────────────────┐    ┌──────────────┐     │                     │
│  │ PurchaseOrderV2  │───►│  POItem      │     │                     │
│  │ PO-YYYYMMDD-NNN  │    │  (UUID)      │─────┘                     │
│  │                  │    │              │──────► Ingredient (Kitchen)│
│  │  classId ─────────────────────────────────► CourseSchedule (Sched)│
│  │  requestedBy ─────────────────────────────► Employee             │
│  │  supplierId ──────────────────────────────► Supplier             │
│  └────┬───┬───┬───┬─┘    └──────────────┘                           │
│       │   │   │   │                                                 │
│       │   │   │   └──────────────────────────────┐                  │
│       │   │   └───────────────────────┐          │                  │
│       │   └────────────────┐          │          │                  │
│       ▼                    ▼          ▼          ▼                  │
│  ┌──────────────┐  ┌──────────────┐ ┌────────┐ ┌────────────┐      │
│  │ POApproval   │  │ POAcceptance │ │Advance │ │ POTracking │      │
│  │ APV-*-NNN    │  │ ACC-*-NNN   │ │ADV-*   │ │ TRK-*-NNN  │      │
│  │              │  │             │ │-NNN    │ │            │      │
│  │ approvedBy──►│  │ acceptedBy─►│ │paidBy─►│ │            │      │
│  │   Employee   │  │   Employee  │ │Employee│ │            │      │
│  └──────────────┘  └─────────────┘ └────────┘ └────────────┘      │
│                                                                     │
│       │ (PO → RECEIVING)                                            │
│       ▼                                                             │
│  ┌──────────────────┐    ┌──────────────┐                           │
│  │ GoodsReceivedNote│───►│  GRNItem     │                           │
│  │ GRN-YYYYMMDD-NNN │    │  (UUID)      │──────► IngredientLot      │
│  │                  │    │              │        (Kitchen domain)    │
│  │  receivedBy ─────────────────────────────────► Employee          │
│  └──────────────────┘    └──────────────┘                           │
│                                                                     │
│       │ (ถ้ามีปัญหา)                                                │
│       ▼                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  POIssue     │───►│  POReturn    │    │  CreditNote  │           │
│  │  ISS-*-NNN   │    │  RTN-*-NNN   │    │  CN-*-NNN    │           │
│  │              │───►│              │    │              │           │
│  │  reportedBy─►│    │  returnedBy─►│    │  issuedBy──►│           │
│  │   Employee   │    │   Employee   │    │   Employee   │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│                                                                     │
└──────────────────────────────────────────────────────────────────────┘

EXTERNAL REFERENCES (จาก domain อื่น):
  ● Ingredient       → Kitchen domain (src/lib/repositories/kitchenRepo.js)
  ● IngredientLot    → Kitchen domain (LOT-YYYYMMDD-NNN)
  ● CourseSchedule   → Schedule domain (classId = CLS-YYYYMM-NNN)
  ● Employee         → Employee domain (TVS-EMP-YYYY-NNNN)
  ● Recipe           → Recipe domain (RecipeIngredient for BOM calc)
  ● Product          → Product domain (Course catalog)
```

---

## 3. Status Machines

### 3.1 PurchaseOrderV2 Status

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
  ┌─────────┐   ┌────────────────┐   ┌──────────┐           │
  │  DRAFT  │──►│ REQUEST_REVIEW │──►│ APPROVED │           │
  └─────────┘   └────────────────┘   └────┬─────┘           │
       ▲              │                    │                  │
       │              │                    ▼                  │
       │              │              ┌──────────┐            │
       │              └──────────────│ REJECTED │────────────┘
       │               (chef reject) └──────────┘  (แก้ไข → DRAFT)
       │
       │                             ┌──────────┐
       │                             │ ORDERING │◄── ฝ่ายจัดซื้อ accept
       │                             └────┬─────┘
       │                                  │
       │                                  ▼
       │                             ┌──────────┐
       │                             │ ORDERED  │◄── สั่งซื้อแล้ว
       │                             └────┬─────┘
       │                                  │
       │                                  ▼
       │                             ┌───────────┐
       │                             │ RECEIVING │◄── เริ่มรับของ
       │                             └──┬──┬──┬──┘
       │                                │  │  │
       │                    ┌───────────┘  │  └───────────┐
       │                    ▼              ▼              ▼
       │              ┌──────────┐  ┌──────────┐  ┌─────────┐
       │              │ RECEIVED │  │ PARTIAL  │  │  ISSUE  │
       │              └────┬─────┘  └────┬─────┘  └────┬────┘
       │                   │             │             │
       │                   ▼             │             ├──► RETURN
       │              ┌──────────┐       │             └──► CREDIT_NOTE
       │              │  CLOSED  │◄──────┘
       │              └──────────┘  (เมื่อรับครบ)
       │
       └── CANCELLED (ยกเลิก PO ก่อน ORDERING)
```

**Valid transitions:**

| From | To | Condition |
|------|----|-----------|
| DRAFT | REQUEST_REVIEW | PO มี items ครบ |
| REQUEST_REVIEW | APPROVED | Chef approve |
| REQUEST_REVIEW | REJECTED | Chef reject (ต้องมี reason) |
| REJECTED | DRAFT | แก้ไข PO แล้วส่งใหม่ |
| APPROVED | ORDERING | ฝ่ายจัดซื้อ accept |
| ORDERING | ORDERED | บันทึก supplier + invoice ref |
| ORDERED | RECEIVING | เริ่มรับของ (สร้าง GRN แรก) |
| RECEIVING | RECEIVED | รับครบทุก item |
| RECEIVING | PARTIAL | รับบางส่วน |
| RECEIVING | ISSUE | มีปัญหากับของที่รับ |
| PARTIAL | RECEIVED | รับส่วนที่เหลือครบ |
| PARTIAL | ISSUE | มีปัญหากับของที่รับ |
| RECEIVED | CLOSED | Finalize + ปิด PO |
| ISSUE | RETURN | ตีกลับสินค้า |
| ISSUE | CREDIT_NOTE | วอยเงินคืน |
| DRAFT | CANCELLED | ยกเลิกก่อนส่ง approve |
| REQUEST_REVIEW | CANCELLED | ยกเลิกระหว่างรอ approve |

### 3.2 POTracking Status

```
  PENDING → IN_TRANSIT → ARRIVED → DELIVERED
                │
                └──► DELAYED (มี delay → กลับ IN_TRANSIT เมื่อเคลื่อนไหวอีกครั้ง)
```

| Status | ความหมาย |
|--------|----------|
| PENDING | รอ supplier จัดส่ง |
| IN_TRANSIT | อยู่ระหว่างขนส่ง |
| DELAYED | ล่าช้ากว่ากำหนด |
| ARRIVED | ถึงโรงเรียนแล้ว (รอ inspect) |
| DELIVERED | ส่งมอบเรียบร้อย (ตรงกับ GRN) |

### 3.3 POReturn Status

```
  INITIATED → SHIPPED_BACK → RECEIVED_BY_SUPPLIER → REFUNDED
                                                        │
                                                        └──► CREDIT_ISSUED (ได้ credit note แทน refund)
```

| Status | ความหมาย |
|--------|----------|
| INITIATED | เริ่มกระบวนการตีกลับ |
| SHIPPED_BACK | ส่งของกลับ supplier แล้ว |
| RECEIVED_BY_SUPPLIER | Supplier รับของคืนแล้ว |
| REFUNDED | ได้เงินคืนแล้ว |
| CREDIT_ISSUED | ได้ credit note จาก supplier |

### 3.4 CreditNote Status

```
  DRAFT → ISSUED → APPLIED → VOID
```

| Status | ความหมาย |
|--------|----------|
| DRAFT | กำลังร่าง |
| ISSUED | ออก CN แล้ว |
| APPLIED | ใช้ CN หักลบกับ PO ถัดไปแล้ว |
| VOID | ยกเลิก CN |

### 3.5 Advance Status

```
  REQUESTED → APPROVED → DISBURSED → SETTLED
                │                       │
                └──► REJECTED           └──► PARTIAL_SETTLED (ยังเคลียร์ไม่ครบ)
```

| Status | ความหมาย |
|--------|----------|
| REQUESTED | ขอเบิกเงินทดรอง |
| APPROVED | ผู้จัดการอนุมัติ |
| REJECTED | ไม่อนุมัติ |
| DISBURSED | จ่ายเงินแล้ว |
| SETTLED | เคลียร์เงินทดรองครบ (มีใบเสร็จ) |
| PARTIAL_SETTLED | เคลียร์บางส่วน |

### 3.6 POIssue Status

```
  OPEN → INVESTIGATING → ┬─ RESOLVED (แก้ไขได้)
                          ├─ RETURN_INITIATED (ต้องตีกลับของ)
                          └─ CREDIT_REQUESTED (ขอวอยคืน)
```

| Status | ความหมาย |
|--------|----------|
| OPEN | รายงานปัญหาใหม่ |
| INVESTIGATING | กำลังตรวจสอบ |
| RESOLVED | แก้ไขเสร็จ (ไม่ต้อง return/credit) |
| RETURN_INITIATED | เริ่มกระบวนการตีกลับ → link ไปที่ POReturn |
| CREDIT_REQUESTED | ขอ credit note → link ไปที่ CreditNote |

---

## 4. BOM Calculation Flow

เมื่อ ClassId ถูก assign ให้ CourseSchedule → ระบบคำนวณวัตถุดิบที่ต้องซื้อ:

```
┌─────────────────┐
│ CourseSchedule   │  classId = CLS-202603-001
│ productId ───────┼──► Product (Course)
│ studentCount = 8 │                │
└─────────────────┘                │
                                   ▼
                          ┌─────────────────┐
                          │ CourseMenu       │  Product ↔ Recipe junction
                          │ recipeId ────────┼──► Recipe
                          └─────────────────┘        │
                                                     ▼
                                            ┌──────────────────┐
                                            │ RecipeIngredient  │
                                            │ ingredientId ─────┼──► Ingredient
                                            │ qty = 0.5 (kg)    │
                                            └──────────────────┘
                                                     │
                                                     ▼
                                          ┌────────────────────────┐
                                          │ Required Qty Calc      │
                                          │                        │
                                          │ requiredQty            │
                                          │   = recipeIngredient   │
                                          │     .qty × studentCount│
                                          │   = 0.5 × 8 = 4.0 kg  │
                                          └───────────┬────────────┘
                                                      │
                                                      ▼
                                          ┌────────────────────────┐
                                          │ Stock Comparison       │
                                          │                        │
                                          │ currentStock = 1.5 kg  │
                                          │ requiredQty  = 4.0 kg  │
                                          │ shortfall    = 2.5 kg  │
                                          │                        │
                                          │ ถ้า shortfall > 0      │
                                          │   → สร้าง POItem      │
                                          └───────────┬────────────┘
                                                      │
                                                      ▼
                                          ┌────────────────────────┐
                                          │ PO Generation          │
                                          │                        │
                                          │ Group POItems by       │
                                          │ preferred supplier     │
                                          │ → 1 PO per supplier    │
                                          │ Status = DRAFT         │
                                          └────────────────────────┘
```

### Calculation Rules

1. **Per recipe**: `requiredQty = recipeIngredient.qty × studentCount`
2. **Multiple recipes per class**: sum all requiredQty per ingredient
3. **Stock check**: `shortfall = totalRequired - Ingredient.currentStock`
4. **IngredientLot consideration**: ตรวจ FEFO lots ที่ยังไม่หมดอายุ → `availableStock = SUM(lot.remainingQty WHERE status=ACTIVE AND expiresAt > classDate)`
5. **Buffer**: เพิ่ม 10% buffer สำหรับ wastage (configurable)
6. **Grouping**: POItems ที่มี preferred supplier เดียวกัน → รวมเป็น PO เดียว
7. **Zero shortfall**: ถ้าสต็อกพอ → ไม่สร้าง PO (log ไว้เฉยๆ)

### Edge Cases

- **ไม่มี Recipe**: Course ที่ยังไม่ผูก Recipe → skip + warning log
- **ไม่มี Supplier**: Ingredient ไม่มี preferred supplier → PO ไม่ระบุ supplier (ฝ่ายจัดซื้อเลือกเอง)
- **หลาย Class วันเดียวกัน**: aggregate ทุก class ก่อนสร้าง PO → ลดจำนวน PO
- **Class cancelled**: ถ้า PO ยัง DRAFT → auto CANCELLED; ถ้า ORDERED แล้ว → ไม่ cancel อัตโนมัติ (ต้อง manual)

---

## 5. ID Formats

| Entity | Format | ตัวอย่าง | Generator |
|--------|--------|----------|-----------|
| Supplier | `SUP-NNN` | SUP-001 | Auto-increment per creation |
| PurchaseOrderV2 | `PO-YYYYMMDD-NNN` | PO-20260322-001 | Daily serial reset |
| POApproval | `APV-YYYYMMDD-NNN` | APV-20260322-001 | Daily serial reset |
| POAcceptance | `ACC-YYYYMMDD-NNN` | ACC-20260322-001 | Daily serial reset |
| POTracking | `TRK-YYYYMMDD-NNN` | TRK-20260322-001 | Daily serial reset |
| GoodsReceivedNote | `GRN-YYYYMMDD-NNN` | GRN-20260322-001 | Daily serial reset |
| POReturn | `RTN-YYYYMMDD-NNN` | RTN-20260322-001 | Daily serial reset |
| CreditNote | `CN-YYYYMMDD-NNN` | CN-20260322-001 | Daily serial reset |
| POIssue | `ISS-YYYYMMDD-NNN` | ISS-20260322-001 | Daily serial reset |
| Advance | `ADV-YYYYMMDD-NNN` | ADV-20260322-001 | Daily serial reset |

### ID Generation Pattern

```javascript
// ตาม convention เดียวกับ kitchenRepo.generateLotId()
async function generatePOId(prisma) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PO-${dateStr}-`;

  const latest = await prisma.purchaseOrderV2.findFirst({
    where: { poId: { startsWith: prefix } },
    orderBy: { poId: 'desc' },
  });

  const serial = latest
    ? String(parseInt(latest.poId.split('-').pop()) + 1).padStart(3, '0')
    : '001';

  return `${prefix}${serial}`;
}
```

---

## 6. API Routes (Planned)

### Suppliers

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/suppliers` | List suppliers (search, filter) | ADMIN+ |
| POST | `/api/procurement/suppliers` | Create supplier | ADMIN+ |
| GET | `/api/procurement/suppliers/[id]` | Get supplier detail | ADMIN+ |
| PATCH | `/api/procurement/suppliers/[id]` | Update supplier | ADMIN+ |

### Purchase Orders

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/po` | List POs (filter: status, classId, date range) | ADMIN+, Chef (own class), Purchasing |
| POST | `/api/procurement/po` | Create PO (manual or auto from BOM) | ADMIN+ |
| GET | `/api/procurement/po/[id]` | Get PO detail + items + history | ADMIN+, Chef (own), Purchasing |
| PATCH | `/api/procurement/po/[id]` | Update PO (DRAFT only) | ADMIN+, Creator |
| DELETE | `/api/procurement/po/[id]` | Cancel PO (DRAFT/REQUEST_REVIEW only) | ADMIN+ |

### Approval Flow

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/procurement/po/[id]/submit` | Submit PO for review (DRAFT → REQUEST_REVIEW) | Creator |
| POST | `/api/procurement/po/[id]/approve` | Chef approves PO | HEAD_CHEF, Chef (own class) |
| POST | `/api/procurement/po/[id]/reject` | Chef rejects PO (requires reason) | HEAD_CHEF, Chef (own class) |

### Purchasing Flow

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/procurement/po/[id]/accept` | ฝ่ายจัดซื้อรับ PO (APPROVED → ORDERING) | Purchasing, ADMIN+ |
| PATCH | `/api/procurement/po/[id]/order` | บันทึกว่าสั่งซื้อแล้ว (ORDERING → ORDERED) | Purchasing, ADMIN+ |

### Tracking

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/po/[id]/tracking` | Get tracking records | Purchasing, ADMIN+ |
| POST | `/api/procurement/po/[id]/tracking` | Create/update tracking | Purchasing, ADMIN+ |

### Goods Received

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/po/[id]/grn` | List GRNs for PO | Purchasing, ADMIN+ |
| POST | `/api/procurement/po/[id]/grn` | Create GRN (รับของ → auto-create Lot) | Purchasing, ADMIN+ |
| PATCH | `/api/procurement/grn/[id]` | Update GRN | Purchasing, ADMIN+ |

### Issues & Returns

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/po/[id]/issues` | List issues for PO | Purchasing, ADMIN+ |
| POST | `/api/procurement/po/[id]/issues` | Report issue | Purchasing, ADMIN+, Chef |
| POST | `/api/procurement/issues/[id]/return` | Initiate return from issue | Purchasing, ADMIN+ |
| POST | `/api/procurement/issues/[id]/credit-note` | Request credit note from issue | Purchasing, ADMIN+ |

### Credit Notes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/credit-notes` | List all credit notes | ADMIN+ |
| PATCH | `/api/procurement/credit-notes/[id]` | Update CN status (APPLY/VOID) | ADMIN+ |

### Advances

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/procurement/advances` | List advances (filter: status, employeeId) | ADMIN+, Own employee |
| POST | `/api/procurement/advances` | Request advance | Any employee |
| PATCH | `/api/procurement/advances/[id]` | Approve/disburse/settle advance | ADMIN+, MANAGER |
| POST | `/api/procurement/advances/[id]/receipts` | Upload receipt for settlement | Requester |

### Auto-generation

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/procurement/generate-from-class` | คำนวณ BOM + สร้าง PO draft จาก classId | ADMIN+, HEAD_CHEF |

---

## 7. Role Permissions

### Permission Matrix

| Action | DEVELOPER | ADMIN | MANAGER | HEAD_CHEF | Chef (EMPLOYEE) | Purchasing (EMPLOYEE) | Other EMPLOYEE |
|--------|-----------|-------|---------|-----------|-----------------|----------------------|----------------|
| View all POs | Yes | Yes | Yes | Yes | Own class only | Approved+ only | No |
| Create PO (manual) | Yes | Yes | Yes | Yes | Own class only | No | No |
| Edit PO (DRAFT) | Yes | Yes | Yes | Creator only | Creator only | No | No |
| Submit for review | Yes | Yes | Yes | Creator | Creator | No | No |
| Approve/Reject PO | Yes | Yes | No | Yes | Own class only | No | No |
| Accept PO | Yes | Yes | No | No | No | Yes | No |
| Mark as ordered | Yes | Yes | No | No | No | Yes | No |
| Create tracking | Yes | Yes | No | No | No | Yes | No |
| Create GRN (รับของ) | Yes | Yes | No | No | No | Yes | No |
| Report issue | Yes | Yes | Yes | Yes | Own class | Yes | No |
| Initiate return | Yes | Yes | Yes | No | No | Yes | No |
| Issue credit note | Yes | Yes | Yes | No | No | No | No |
| Manage suppliers | Yes | Yes | Yes | No | No | Yes | No |
| Request advance | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Approve advance | Yes | Yes | Yes | No | No | No | No |
| View advances (all) | Yes | Yes | Yes | No | No | No | No |
| View advances (own) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Generate PO from class | Yes | Yes | Yes | Yes | No | No | No |

### Role Notes

- **HEAD_CHEF** (จาก ADR-045): full access ในโดเมน Kitchen + Procurement approval — เทียบเท่า domain specialist
- **Chef** = EMPLOYEE ที่ถูก assign เป็น instructor ของ CourseSchedule — ดู `courseSchedule.instructorId`
- **Purchasing** = EMPLOYEE ที่มี `department = 'purchasing'` — ยังไม่มี field นี้ใน schema ปัจจุบัน ต้องเพิ่มหรือใช้ role-based approach
- **"Own class"** = PO ที่ classId ตรงกับ CourseSchedule ที่ employee เป็น instructor

### Implementation Strategy

```javascript
// ใช้ permissionMatrix.js pattern จาก ADR-045
// เพิ่ม procurement permissions:
const PROCUREMENT_PERMISSIONS = {
  'procurement.po.view':      ['DEVELOPER', 'ADMIN', 'MANAGER', 'HEAD_CHEF'],
  'procurement.po.create':    ['DEVELOPER', 'ADMIN', 'MANAGER', 'HEAD_CHEF'],
  'procurement.po.approve':   ['DEVELOPER', 'ADMIN', 'HEAD_CHEF'],
  'procurement.po.accept':    ['DEVELOPER', 'ADMIN'],  // + purchasing check
  'procurement.grn.create':   ['DEVELOPER', 'ADMIN'],  // + purchasing check
  'procurement.advance.approve': ['DEVELOPER', 'ADMIN', 'MANAGER'],
  'procurement.supplier.manage': ['DEVELOPER', 'ADMIN', 'MANAGER'],
};

// Chef + Purchasing ใช้ custom logic (own-class / department check)
// ไม่ใส่ใน static matrix — ใช้ runtime check
```

---

## 8. Integration Points

### 8.1 Kitchen Domain (Ingredient, IngredientLot)

| Integration | Direction | Description |
|-------------|-----------|-------------|
| BOM Calculation | Procurement ← Kitchen | อ่าน `Ingredient.currentStock` + `IngredientLot` (FEFO) เพื่อคำนวณ shortfall |
| GRN → Lot Creation | Procurement → Kitchen | เมื่อรับของ (GRN) → auto-create `IngredientLot` + update `Ingredient.currentStock` |
| Stock Deduction | Kitchen → Procurement | เมื่อ session complete → ตัดสต็อกจาก Lot (FEFO) อาจ trigger PO ถ้าสต็อกต่ำ |

```
Procurement                          Kitchen
────────────                         ──────────
GRN created  ──── auto-create ────►  IngredientLot (ACTIVE)
                                      + Ingredient.currentStock += qty

BOM calc     ◄── read stock ──────   Ingredient.currentStock
             ◄── read lots  ──────   IngredientLot (ACTIVE, not expired)
```

**Critical Transaction**: GRN → Lot creation ต้องอยู่ใน `prisma.$transaction` เดียวกัน เพื่อป้องกัน inconsistency:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. Create GRN
  const grn = await tx.goodsReceivedNote.create({ ... });

  // 2. Create GRN Items
  for (const item of items) {
    await tx.grnItem.create({ ... });

    // 3. Create IngredientLot
    await tx.ingredientLot.create({
      data: {
        lotId: await generateLotId(tx),
        ingredientId: item.ingredientId,
        receivedQty: item.receivedQty,
        remainingQty: item.receivedQty,
        expiresAt: item.expiresAt,
        status: 'ACTIVE',
        notes: `From GRN ${grn.grnId}`,
      }
    });

    // 4. Update Ingredient.currentStock
    await tx.ingredient.update({
      where: { id: item.ingredientId },
      data: { currentStock: { increment: item.receivedQty } },
    });
  }

  return grn;
});
```

### 8.2 Schedule Domain (CourseSchedule, classId)

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Class → PO trigger | Schedule → Procurement | เมื่อ classId ถูก assign → trigger BOM calc + PO creation |
| PO → Class link | Procurement → Schedule | PO.classId reference กลับไปที่ CourseSchedule |
| Class cancel | Schedule → Procurement | ถ้า class ถูก cancel → cancel DRAFT POs |

```
Schedule                             Procurement
────────────                         ──────────
classId assigned ─── trigger ────►   BOM calc → PO (DRAFT)
class cancelled  ─── trigger ────►   PO (DRAFT) → CANCELLED
                                     PO (ORDERED+) → no auto-cancel
```

### 8.3 Recipe Domain (Recipe, RecipeIngredient, CourseMenu)

| Integration | Direction | Description |
|-------------|-----------|-------------|
| BOM data source | Recipe → Procurement | อ่าน CourseMenu → Recipe → RecipeIngredient เพื่อคำนวณ qty |
| Equipment tracking | Recipe → Procurement | RecipeEquipment บอก special equipment ที่ต้องใช้ (ไม่ต้องซื้อ แต่ต้อง reserve) |

```
Recipe                               Procurement
────────────                         ──────────
CourseMenu     ─── lookup ────►      Product → Recipe mapping
RecipeIngredient── qty data ────►    BOM calculation input
RecipeEquipment ── info only ────►   Equipment reservation (ไม่อยู่ใน PO)
```

### 8.4 Employee Domain

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Approval actor | Employee → Procurement | POApproval.approvedBy → Employee.id |
| Purchasing actor | Employee → Procurement | POAcceptance.acceptedBy → Employee.id |
| Advance requester | Employee → Procurement | Advance.requestedBy → Employee.id |
| Instructor lookup | Employee → Schedule → Procurement | CourseSchedule.instructorId → ใช้ตรวจ "own class" permission |

---

## Appendix A: Key Prisma Model Shapes (Draft)

> ยังไม่ commit เข้า schema.prisma — เป็น draft สำหรับ implementation phase

```prisma
model Supplier {
  id          String   @id @default(uuid())
  supplierId  String   @unique @map("supplier_id")    // SUP-NNN
  name        String
  contactName String?  @map("contact_name")
  phone       String?
  email       String?
  address     String?
  notes       String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  purchaseOrders PurchaseOrderV2[]

  @@map("suppliers")
}

model PurchaseOrderV2 {
  id            String   @id @default(uuid())
  poId          String   @unique @map("po_id")         // PO-YYYYMMDD-NNN
  classId       String?  @map("class_id")              // CLS-YYYYMM-NNN ref
  supplierId    String?  @map("supplier_id")
  status        String   @default("DRAFT")             // Status machine
  requestedBy   String   @map("requested_by")          // Employee UUID
  totalAmount   Decimal? @map("total_amount")
  currency      String   @default("THB")
  notes         String?
  invoiceRef    String?  @map("invoice_ref")
  orderedAt     DateTime? @map("ordered_at")
  expectedDelivery DateTime? @map("expected_delivery")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  supplier      Supplier? @relation(fields: [supplierId], references: [id])
  requestedByEmp Employee @relation(fields: [requestedBy], references: [id])
  items         POItem[]
  approvals     POApproval[]
  acceptances   POAcceptance[]
  trackings     POTracking[]
  grns          GoodsReceivedNote[]
  issues        POIssue[]
  advances      Advance[]

  @@map("purchase_orders_v2")
}

model POItem {
  id            String   @id @default(uuid())
  poId          String   @map("po_id")
  ingredientId  String   @map("ingredient_id")
  requiredQty   Decimal  @map("required_qty")
  unit          String                                 // kg, g, L, pcs
  unitPrice     Decimal? @map("unit_price")
  totalPrice    Decimal? @map("total_price")
  notes         String?

  purchaseOrder PurchaseOrderV2 @relation(fields: [poId], references: [id])
  ingredient    Ingredient @relation(fields: [ingredientId], references: [id])

  @@map("po_items")
}
```

---

## Appendix B: Future Enhancements

1. **Supplier rating** — ให้คะแนน supplier ตาม delivery time, quality, price → auto-suggest preferred supplier
2. **Budget control** — กำหนดวงเงินต่อเดือน/ต่อ class → alert เมื่อเกิน
3. **Recurring PO** — สำหรับวัตถุดิบที่สั่งประจำ (น้ำตาล, แป้ง) → auto-create PO ตาม schedule
4. **Supplier portal** — ให้ supplier เข้ามาดู PO + update tracking ได้เอง (future phase)
5. **Price comparison** — เก็บประวัติราคา → แนะนำ supplier ที่ราคาดีที่สุด
6. **Mobile GRN** — ฝ่ายรับของสแกน barcode + ถ่ายรูป ผ่านมือถือ
