# ADR-039: Chat-First Revenue Attribution (Slip OCR)

**Status:** Accepted
**Date:** 2026-03-19
**Version:** v0.26.0 (Phase 26)
**Implemented by:** Antigravity — verified by Claude

---

## Context

ระบบก่อนหน้า (v0.25.0) ใช้ตัวเลข Revenue จาก Meta Graph API (`AdDailyMetric.revenue`) ซึ่ง Meta **ประมาณเอง** โดยไม่มีข้อมูล conversion จริงจาก V School เลย เพราะ:
- ไม่มี Facebook Pixel บน website
- ไม่มี Conversions API (CAPI)
- ลูกค้าชำระเงินผ่าน bank transfer และส่งสลิปใน FB/LINE Messenger

ยอดเงินจริงทั้งหมดอยู่ในรูปสลิปโอนเงินที่ส่งในแชท แต่ระบบไม่ได้อ่านหรือเก็บข้อมูลนี้

---

## Decision

**ใช้สลิปโอนเงินในแชทเป็น Source of Truth ของ Revenue**

### กลไก

1. **Webhook รับ image attachment** — เมื่อ FB/LINE webhook รับข้อความที่มี `attachmentType = image`
2. **Gemini Vision OCR** — `slipParser.parseSlip(imageUrl)` ส่ง imageUrl ไป Gemini 2.0 Flash → ได้ `SlipResult`
3. **Confidence threshold** — `confidence ≥ 0.80` ถึงสร้าง Transaction อัตโนมัติ (ต่ำกว่า → log warning → employee manual add)
4. **Transaction (PENDING)** — `paymentRepo.createPendingFromSlip()` สร้างโดยอิง `Transaction` model (`slipImageUrl`, `slipData`, `slipStatus`) ภายใน `prisma.$transaction`
5. **Employee Verify** — `paymentRepo.verifyPayment(transactionId, employeeId)` → `slipStatus = VERIFIED` + Order `status = CLOSED`
6. **Revenue aggregation** — `paymentRepo.getMonthlyRevenue(year, month)` แยก `fromAds` vs `organic` จาก `firstTouchAdId`

### SlipResult Type

```typescript
type SlipResult = {
  isSlip: boolean;       // true ถ้า Gemini ยืนยัน + confidence ≥ 0.80
  confidence: number;    // 0.0 – 1.0
  amount: number | null; // THB
  date: string | null;   // ISO 8601
  refNumber: string | null;
  bankName: string | null;
  rawText: string | null; // สำหรับ audit
}
```

### REQ-07: First Touch Ad Attribution

เพิ่ม `Conversation.firstTouchAdId` — บันทึก `referral.ad_id` จาก FB webhook เฉพาะตอน CREATE conversation (immutable)

```
Transaction → Order → Conversation.firstTouchAdId → Ad → AdSet → Campaign
```

`getMonthlyRevenue()` ใช้ `firstTouchAdId` เพื่อแยก Ads vs Organic — ROAS คำนวณจากเงินจริง

---

## Rationale

| วิธี | Revenue Accuracy | ต้นทุน | ความซับซ้อน |
|---|---|---|---|
| Meta Estimated (เดิม) | ❌ ต่ำมาก | $0 | ต่ำ |
| Pixel + CAPI | ✅ สูง | ต้องมี website | กลาง |
| Offline Upload (manual) | ✅ สูง | เวลา | กลาง |
| **Slip OCR จากแชท** | ✅ สูงมาก | $0 (Gemini free) | กลาง |

Chat-First เหมาะสุดสำหรับ V School เพราะ:
- ทุก transaction เกิดในแชทอยู่แล้ว
- ลูกค้าส่งสลิปเองโดยธรรมชาติ
- ไม่ต้องเปลี่ยน workflow ของพนักงานหรือลูกค้า

---

## Consequences

### ✅ Positive
- Revenue จริงจากสลิป — ROAS แม่นยำ
- Human verification step ป้องกันสลิปปลอม
- `refNumber` unique constraint ป้องกัน duplicate
- Attribution tree สมบูรณ์: Transaction → Conversation → Ad → ROAS

### ⚠️ Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Gemini OCR ผิด (confidence ต่ำ) | threshold 0.80 + employee verify |
| สลิปภาพไม่ชัด | manual add ผ่าน UI |
| refNumber ไม่มีในสลิปบางธนาคาร | refNumber optional — ใช้ imageUrl + date + amount แทน |
| Historical conv ไม่มี firstTouchAdId | null = organic revenue — ยอมรับได้ |

---

## Files Changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `prisma/schema.prisma` | `Conversation.firstTouchAdId String?` |
| `src/lib/slipParser.js` | ใหม่ — Gemini 2.0 Flash Vision OCR (`parseSlip`) |
| `src/lib/repositories/paymentRepo.js` | ใหม่ — `createPendingFromSlip`, `verifyPayment`, `getMonthlyRevenue` |
| `src/app/api/webhooks/facebook/route.js` | บันทึก `referral.ad_id` + trigger slip OCR |
| `src/app/api/webhooks/line/route.js` | trigger slip OCR เมื่อ image attachment |
| `src/app/api/payments/verify/[id]/route.js` | ใหม่ — POST verify (employee action) |
| `src/app/api/payments/pending/route.js` | ใหม่ — GET pending slips |

---

## Verification

| Test File | Tests | สถานะ |
|---|---|---|
| `slipParser.test.js` | 2 tests (valid slip, confidence rejection) | ✅ |
| `paymentRepo.test.js` | 6 tests (create, duplicate, verify, revenue) | ✅ |

**Key test cases:**
- Gemini mock returns `confidence: 0.95` → creates PENDING Transaction
- Gemini mock returns `confidence: 0.70` → rejects (throws error)
- Duplicate `refNumber` → rejects (unique constraint)
- `verifyPayment` → `slipStatus = VERIFIED` + Order `CLOSED`
- `getMonthlyRevenue` → correct `fromAds` / `organic` split

---

## Related
- ADR-024: Marketing Intelligence Pipeline (Revenue aggregation)
- ADR-025: Identity Resolution (Customer attribution)
- ADR-028: Facebook Messaging (Webhook < 200ms)
- `docs/attribution_tree.md` — full revenue attribution flow
- `docs/architecture/domain-flows.md` — Flow 7 + Flow 8
