# ADR-046: POS Receipt Generation & Printer Integration

**Date:** 2026-03-21
**Status:** Proposed
**Version:** v1.5.0
**Author:** Claude (Lead Architect)
**Requested by:** Boss (Owner)

---

## Context

POS ปัจจุบัน (PremiumPOS.js) สร้าง Order + Transaction ลง DB แล้วแสดง success modal 4 วินาที แต่:

1. **ไม่มีใบเสร็จ** — ลูกค้าไม่ได้รับ proof of purchase
2. **ไม่มีการเชื่อมต่อเครื่องปริ้น** — พนักงานต้องจดมือหรือไม่ออกบิลเลย
3. **ไม่มีประวัติบิล** — ไม่สามารถ reprint หรือดูย้อนหลังได้
4. **ไม่รองรับ thermal printer** — โรงเรียนมีเครื่อง thermal 80mm อยู่แล้ว

โรงเรียนสอนทำอาหารต้องการออกบิลทุกครั้งที่ checkout เพื่อ:
- ลูกค้าใช้เป็นหลักฐานการชำระเงิน
- ใช้เป็นหลักฐานทางบัญชี
- ส่งบิลทาง LINE ให้ลูกค้าที่จ่ายผ่านแชท

---

## Decision

### 1. Receipt Model — ผูก Order 1:1

```prisma
model Receipt {
  id          String   @id @default(uuid())
  receiptId   String   @unique @map("receipt_id")   // RCP-YYYYMMDD-XXX
  orderId     String   @unique @map("order_id")     // 1:1 กับ Order
  issuedById  String   @map("issued_by_id")         // employeeId ที่ออกบิล
  subtotal    Float                                   // ก่อน VAT
  vatAmount   Float    @map("vat_amount")            // VAT 7%
  totalAmount Float    @map("total_amount")          // รวม VAT
  paymentMethod String @map("payment_method")        // CASH, TRANSFER, CREDIT_CARD
  note        String?
  printCount  Int      @default(0) @map("print_count")  // นับจำนวนครั้งที่ print
  lastPrintAt DateTime? @map("last_print_at")
  createdAt   DateTime @default(now()) @map("created_at")

  order    Order    @relation(fields: [orderId], references: [id])
  issuedBy Employee @relation("ReceiptIssuer", fields: [issuedById], references: [id])
}
```

### 2. Receipt ID Format

```
RCP-[YYYYMMDD]-[SERIAL]
ตัวอย่าง: RCP-20260321-001, RCP-20260321-002
```

- Serial reset ทุกวัน (เริ่ม 001)
- Generate โดย `receiptRepo.js`

### 3. สถาปัตยกรรมการพิมพ์ — 3 ช่องทาง

```
┌─────────────────────────────────────────────────────────┐
│  POS Checkout Complete                                   │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Thermal  │  │ Browser      │  │ LINE Send         │  │
│  │ 80mm     │  │ Print (A4)   │  │ (PNG image)       │  │
│  │ ESC/POS  │  │ window.print │  │ via LINE Msg API  │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│       ↑               ↑                    ↑             │
│       │               │                    │             │
│  WebUSB/Serial   CSS @media print    html-to-image       │
│  (raw ESC/POS)   (@page 80mm/A4)    → LINE pushImage    │
└─────────────────────────────────────────────────────────┘
```

#### ช่องทาง A: Thermal Printer 80mm (หลัก)
- ใช้ **Web Serial API** (Chrome 89+) หรือ **WebUSB** สำหรับเครื่อง USB
- Generate ESC/POS commands ฝั่ง client (ไม่ต้อง driver)
- Library: `escpos-buffer` หรือ custom ESC/POS encoder
- รองรับ: Thai text (TIS-620 charset), QR code, logo
- **Fallback:** ถ้า browser ไม่รองรับ Web Serial → ใช้ Browser Print

#### ช่องทาง B: Browser Print (สำรอง)
- `window.print()` กับ CSS `@media print`
- Receipt component render เป็น HTML → print dialog
- รองรับทั้ง A4 และ 80mm (CSS `@page { size: 80mm auto }`)

#### ช่องทาง C: LINE Send (เสริม)
- Convert receipt HTML → PNG ด้วย `html-to-image`
- ส่งผ่าน LINE Messaging API `pushImage()` (มีอยู่แล้วใน `lineService.js`)
- ใช้เฉพาะลูกค้าที่มี `lineUserId`

### 4. Receipt Layout (80mm thermal)

```
========================================
         🍣 The V School
      โรงเรียนสอนทำอาหารญี่ปุ่น
         กรุงเทพมหานคร
----------------------------------------
เลขที่: RCP-20260321-001
วันที่: 21/03/2026 14:30
พนักงาน: Fafah
ลูกค้า: คุณสมชาย
----------------------------------------
รายการ                    จำนวน    ราคา
  คอร์ส Basic 30h           1   15,000
  คอร์ส Sushi Pro          1   25,000
----------------------------------------
                    รวม       40,000.00
                    VAT 7%     2,800.00
                    ─────────────────
                    สุทธิ     42,800.00
----------------------------------------
ชำระโดย: โอนเงิน
Ref: PAY-20260321-001
----------------------------------------
      ขอบคุณที่ใช้บริการ 🙏
         The V School
========================================
           [QR Code]
    LINE: @vschool-bkk
========================================
```

### 5. UX Flow

```
Checkout สำเร็จ
    ↓
Receipt Preview Modal (แทน success modal เดิม 4 วิ)
    ↓
┌──────────────────────────────────────┐
│  ✅ ชำระเงินสำเร็จ                    │
│                                       │
│  [preview ใบเสร็จ]                    │
│                                       │
│  [🖨️ พิมพ์]  [📱 ส่ง LINE]  [✖️ ปิด]  │
└──────────────────────────────────────┘
```

- ปุ่ม "พิมพ์" → ตรวจจับ thermal printer ก่อน → ถ้าไม่เจอ → browser print
- ปุ่ม "ส่ง LINE" → แสดงเฉพาะถ้าลูกค้ามี lineUserId
- ปิด modal → กลับ POS หน้าหลัก (เหมือนเดิม)

### 6. Receipt History

- เพิ่มหน้า "ประวัติบิล" ใน Sidebar (กลุ่ม SALES)
- Filter: วันที่, พนักงาน, ลูกค้า
- Action: ดูรายละเอียด, Reprint, ส่ง LINE อีกครั้ง

---

## Consequences

### Positive
- ลูกค้าได้หลักฐานชำระเงินทุกครั้ง
- รองรับ thermal printer ที่มีอยู่แล้ว โดยไม่ต้องติดตั้ง driver
- พนักงานส่งบิลทาง LINE ได้ทันที (ลูกค้าจ่ายผ่านแชท)
- มี audit trail ว่าใครออกบิล + print กี่ครั้ง

### Negative / Risks
- **Web Serial API** ใช้ได้แค่ Chrome/Edge (Safari/Firefox ไม่รองรับ) → ต้องมี browser print fallback
- **Thai text บน thermal** ต้อง encode TIS-620 → อาจมี charset issue กับเครื่อง printer บางรุ่น
- **LINE image** ต้อง render HTML → canvas → PNG ฝั่ง server (client-side html-to-image อาจ font ไม่ครบ)

### Migration
- เพิ่ม `Receipt` model → `prisma db push`
- เพิ่ม relation `Order.receipt` (1:1)
- ไม่กระทบ data เดิม — Order เก่าจะไม่มี receipt (null)

---

## Alternatives Considered

| Option | เหตุที่ไม่เลือก |
|---|---|
| ใช้ native print driver (CUPS/Windows) | ต้อง install driver ทุกเครื่อง, ไม่เหมาะ web app |
| ใช้ print server middleware (e.g. QZ Tray) | ต้อง install software เพิ่ม, complex setup |
| PDF generation ฝั่ง server (Puppeteer) | หนัก, ช้า, ไม่เหมาะ real-time POS |
| ไม่ทำ thermal → ใช้ browser print อย่างเดียว | ช้า, UX ไม่ดี สำหรับ POS workflow |
