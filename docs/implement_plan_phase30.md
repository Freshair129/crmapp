# Implementation Plan — Phase 30: POS Receipt & Printer Integration

**Version:** v1.5.0
**ADR:** ADR-046
**Date:** 2026-03-21
**Author:** Claude (Lead Architect)

---

## Phase Overview

```
Phase 30a — Prisma Schema + Receipt Repository       (1 session)
Phase 30b — Receipt API Routes                        (1 session)
Phase 30c — Receipt Component + Print Preview Modal   (1 session)
Phase 30d — Thermal Printer (ESC/POS via Web Serial)  (1-2 sessions)
Phase 30e — LINE Receipt Send                         (1 session)
Phase 30f — Receipt History Page                      (1 session)
Phase 30g — POS Integration + Tests + Docs            (1 session)
```

---

## Phase 30a — Prisma Schema + Receipt Repository

**Goal:** เพิ่ม Receipt model + repository layer สำหรับ CRUD

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30a.1 | เพิ่ม Receipt model ใน Prisma schema | `prisma/schema.prisma` |
| 30a.2 | เพิ่ม `receipt` relation ใน Order model (1:1) | `prisma/schema.prisma` |
| 30a.3 | เพิ่ม `receiptsIssued` relation ใน Employee model | `prisma/schema.prisma` |
| 30a.4 | `prisma db push` | — |
| 30a.5 | สร้าง `receiptRepo.js` — generateReceiptId, createReceipt, getByOrderId, getHistory | `src/lib/repositories/receiptRepo.js` |

### Prisma Schema

```prisma
model Receipt {
  id            String    @id @default(uuid())
  receiptId     String    @unique @map("receipt_id")
  orderId       String    @unique @map("order_id")
  issuedById    String    @map("issued_by_id")
  customerName  String    @map("customer_name")
  subtotal      Float
  vatRate       Float     @default(0.07) @map("vat_rate")
  vatAmount     Float     @map("vat_amount")
  totalAmount   Float     @map("total_amount")
  items         Json      @default("[]")
  paymentMethod String    @default("TRANSFER") @map("payment_method")
  note          String?
  printCount    Int       @default(0) @map("print_count")
  lastPrintAt   DateTime? @map("last_print_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  order    Order    @relation(fields: [orderId], references: [id])
  issuedBy Employee @relation("ReceiptIssuer", fields: [issuedById], references: [id])

  @@map("receipts")
}
```

### receiptRepo.js — Key Functions

```js
// generateReceiptId() → RCP-20260321-001 (auto-increment per day)
// createReceipt({ orderId, issuedById, items, subtotal, paymentMethod })
// getReceiptByOrderId(orderId)
// getReceiptById(receiptId)
// getReceiptHistory({ dateFrom, dateTo, issuedById, page, limit })
// incrementPrintCount(receiptId)
```

---

## Phase 30b — Receipt API Routes

**Goal:** CRUD API สำหรับ receipt

### New API Routes

| Method | Path | Description | Permission |
|---|---|---|---|
| POST | `/api/receipts` | สร้างบิลจาก orderId | `can(role, 'sales', 'create')` |
| GET | `/api/receipts/[id]` | ดึงข้อมูลบิลตาม receiptId หรือ UUID | `can(role, 'sales', 'view')` |
| GET | `/api/receipts?orderId=` | ดึงบิลตาม orderId | `can(role, 'sales', 'view')` |
| GET | `/api/receipts/history` | ประวัติบิล (paginated, filter) | `can(role, 'sales', 'view')` |
| PATCH | `/api/receipts/[id]/print` | บันทึก print count + timestamp | `can(role, 'sales', 'view')` |

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30b.1 | POST + GET `/api/receipts/route.js` | `src/app/api/receipts/route.js` |
| 30b.2 | GET `/api/receipts/[id]/route.js` | `src/app/api/receipts/[id]/route.js` |
| 30b.3 | GET `/api/receipts/history/route.js` | `src/app/api/receipts/history/route.js` |
| 30b.4 | PATCH `/api/receipts/[id]/print/route.js` | `src/app/api/receipts/[id]/print/route.js` |

---

## Phase 30c — Receipt Component + Print Preview Modal

**Goal:** Receipt UI component ที่ render เป็นทั้ง screen preview และ print format

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30c.1 | `ReceiptTemplate.js` — Pure presentational receipt (80mm layout) | `src/components/ReceiptTemplate.js` |
| 30c.2 | `ReceiptPreviewModal.js` — Modal แสดง preview + action buttons | `src/components/ReceiptPreviewModal.js` |
| 30c.3 | Print CSS — `@media print` + `@page { size: 80mm auto }` | `src/styles/receipt-print.css` |
| 30c.4 | Browser print handler — `window.print()` with receipt-only content | ใน `ReceiptPreviewModal.js` |

### ReceiptTemplate Layout

```
┌────────────────────────────────────┐
│  Logo + ชื่อร้าน + ที่อยู่           │
│  ──────────────────────────────    │
│  เลขที่: RCP-xxx  วันที่: xx/xx    │
│  พนักงาน: xxx   ลูกค้า: xxx       │
│  ──────────────────────────────    │
│  รายการ              จำนวน  ราคา   │
│    item1               1   xxx    │
│    item2               2   xxx    │
│  ──────────────────────────────    │
│  รวม / VAT / สุทธิ                 │
│  ──────────────────────────────    │
│  วิธีชำระ: xxx   Ref: PAY-xxx     │
│  ──────────────────────────────    │
│  ขอบคุณที่ใช้บริการ                  │
│  [QR Code — LINE @vschool-bkk]    │
└────────────────────────────────────┘
```

### ReceiptPreviewModal — Props

```js
<ReceiptPreviewModal
  receipt={receiptData}       // จาก API
  customer={customerData}     // ชื่อ, LINE ID
  onPrint={() => {}}          // thermal or browser
  onSendLINE={() => {}}       // ถ้ามี lineUserId
  onClose={() => {}}
/>
```

---

## Phase 30d — Thermal Printer (ESC/POS via Web Serial)

**Goal:** เชื่อมต่อ thermal printer 80mm ผ่าน Web Serial API

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30d.1 | `thermalPrinter.js` — Web Serial connection, detect, pair | `src/lib/thermalPrinter.js` |
| 30d.2 | ESC/POS encoder — Thai text (TIS-620), bold, cut, align | `src/lib/escposEncoder.js` |
| 30d.3 | `buildReceiptCommands(receipt)` — แปลง receipt data → ESC/POS bytes | `src/lib/escposEncoder.js` |
| 30d.4 | QR code generator สำหรับ ESC/POS | `src/lib/escposEncoder.js` |
| 30d.5 | Printer Settings UI — เลือก/จำ printer + test print | `src/components/PrinterSettings.js` |
| 30d.6 | LocalStorage cache สำหรับ paired printer info | ใน `thermalPrinter.js` |

### Web Serial Flow

```
1. User click "🖨️ พิมพ์"
2. Check localStorage for paired printer
3. If no paired → navigator.serial.requestPort() → user select
4. Open port (baudRate: 9600/115200)
5. Send ESC/POS commands
6. Close port / keep alive for next print
```

### ESC/POS Commands ที่ต้อง implement

```
ESC @          — Initialize printer
ESC a n        — Text alignment (0=left, 1=center, 2=right)
ESC E n        — Bold on/off
ESC ! n        — Font size (double width/height)
GS V m         — Paper cut (partial/full)
GS k           — Print barcode
GS ( k         — Print QR code
ESC t n        — Code page selection (TIS-620 = page 26)
1D 76 30       — Print raster image (logo)
```

### Browser Compatibility

| Browser | Web Serial | Fallback |
|---|---|---|
| Chrome 89+ | ✅ | — |
| Edge 89+ | ✅ | — |
| Safari | ❌ | Browser Print (window.print) |
| Firefox | ❌ | Browser Print (window.print) |

---

## Phase 30e — LINE Receipt Send

**Goal:** ส่งรูปใบเสร็จเป็น PNG ผ่าน LINE Messaging API

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30e.1 | Server-side receipt → PNG renderer | `src/lib/receiptRenderer.js` |
| 30e.2 | Upload PNG → temporary public URL (Supabase Storage หรือ data URL) | `src/lib/receiptRenderer.js` |
| 30e.3 | API route: POST `/api/receipts/[id]/send-line` | `src/app/api/receipts/[id]/send-line/route.js` |
| 30e.4 | ใช้ `lineService.pushImage()` ส่งรูป | ใน route |

### Approach: Server-side rendering

```
Receipt data → React component → html-to-image (server) → PNG buffer
                                        ↓
                              Upload to Supabase Storage
                                        ↓
                              LINE pushImage(lineUserId, imageUrl)
```

> **Alternative:** ถ้า server-side rendering ซับซ้อนเกิน → ใช้ client-side `html-to-image` แล้ว upload PNG เป็น base64

---

## Phase 30f — Receipt History Page

**Goal:** หน้าดูประวัติบิลย้อนหลัง + reprint + re-send LINE

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30f.1 | `ReceiptHistoryPage.js` — table + filters + actions | `src/components/ReceiptHistoryPage.js` |
| 30f.2 | เพิ่ม "ประวัติบิล" ใน Sidebar (กลุ่ม SALES — icon: Receipt/FileText) | `src/components/Sidebar.js` |
| 30f.3 | เพิ่ม view case ใน `page.js` | `src/app/page.js` |

### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  📄 ประวัติบิล                                           │
│                                                          │
│  [📅 วันที่ ▾]  [👤 พนักงาน ▾]  [🔍 ค้นหา...]          │
│                                                          │
│  ┌──────────┬──────────┬────────┬────────┬─────────────┐ │
│  │ เลขบิล    │ วันที่    │ ลูกค้า  │ ยอดรวม  │ Actions    │ │
│  ├──────────┼──────────┼────────┼────────┼─────────────┤ │
│  │ RCP-001  │ 21/03/26 │ สมชาย  │ ฿42,800│ 🖨️ 📱 👁️   │ │
│  │ RCP-002  │ 21/03/26 │ วิภา   │ ฿15,000│ 🖨️ 📱 👁️   │ │
│  └──────────┴──────────┴────────┴────────┴─────────────┘ │
│                                                          │
│  แสดง 1-20 จาก 156 รายการ    [◀ 1 2 3 4 5 ▶]           │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 30g — POS Integration + Tests + Docs

**Goal:** เชื่อม receipt flow เข้า POS checkout + tests + docs

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 30g.1 | แก้ `PremiumPOS.js` — หลัง checkout สำเร็จ → auto-create receipt → show ReceiptPreviewModal | `src/components/PremiumPOS.js` |
| 30g.2 | Unit tests: receiptRepo (generateId, create, history) | `src/lib/__tests__/receiptRepo.test.js` |
| 30g.3 | Unit tests: escposEncoder (Thai text, commands) | `src/lib/__tests__/escposEncoder.test.js` |
| 30g.4 | Integration test: POS → Order → Receipt flow | `src/lib/__tests__/posReceipt.test.js` |
| 30g.5 | อัปเดต `docs/API_REFERENCE.md` — Receipt endpoints | `docs/API_REFERENCE.md` |
| 30g.6 | อัปเดต `docs/architecture/database-erd/full-schema.md` — Receipt model | `docs/architecture/database-erd/full-schema.md` |
| 30g.7 | Changelog entry | `changelog/CL-YYYYMMDD-XXX.md` |

### POS Checkout Flow (ใหม่)

```
เดิม:
  processOrder() → create Order → create Enrollments → show success modal (4s) → clear

ใหม่:
  processOrder() → create Order → create Enrollments → create Receipt
      → show ReceiptPreviewModal
          → [พิมพ์] thermal / browser
          → [ส่ง LINE] ถ้ามี lineUserId
          → [ปิด] clear cart & reset
```

---

## Dependency Map

```
30a (Schema + Repo) → 30b (API Routes) → 30c (Receipt UI + Preview)
                                        → 30d (Thermal Printer)
                                        → 30e (LINE Send)
                                        → 30f (History Page)
                                                    ↓
                              30g (POS Integration + Tests + Docs) ← all
```

30a ต้องเสร็จก่อน เพราะ Receipt model เป็น foundation ของทุก phase

---

## Dependencies (npm)

| Package | Purpose | Phase |
|---|---|---|
| `html-to-image` | Convert receipt HTML → PNG for LINE send | 30e |
| (optional) `qrcode` | Generate QR code for receipt | 30c/30d |

> **หมายเหตุ:** ไม่ใช้ `escpos` npm package เพราะต้องการ native Node.js USB — ใช้ Web Serial API ฝั่ง browser แทน (zero backend dependency)

---

## Known Risks

| Risk | Mitigation |
|---|---|
| Web Serial ใช้ได้แค่ Chrome/Edge | Browser print fallback เสมอ |
| Thai charset (TIS-620) บน thermal printer บางรุ่น | Test กับเครื่องจริง + fallback UTF-8 mode |
| LINE image quality ต่ำ | Render PNG ที่ 2x resolution |
| receipt history query ช้า (เยอะขึ้นเรื่อยๆ) | Index on `created_at` + pagination |
| Server-side PNG render หนัก | ถ้าหนักเกิน → ย้ายเป็น client-side render + upload |

---

## Definition of Done — v1.5.0

- [ ] Receipt model ใน Prisma schema + migration สำเร็จ
- [ ] `receiptRepo.js` — CRUD + generateReceiptId ทำงานถูกต้อง
- [ ] API routes ครบ 5 endpoints
- [ ] `ReceiptTemplate.js` แสดงผลถูกต้อง (80mm + A4)
- [ ] `ReceiptPreviewModal.js` แสดงหลัง POS checkout
- [ ] Thermal printer 80mm พิมพ์ได้จริง (Chrome + Web Serial)
- [ ] Browser print fallback ทำงาน
- [ ] ส่งบิลทาง LINE ได้ (ถ้าลูกค้ามี lineUserId)
- [ ] ประวัติบิลดูย้อนหลังได้ + reprint
- [ ] Tests ผ่าน
- [ ] `npm run build` ผ่านไม่มี error
