# ADR-003: Pricing Model — Setup Fee + Monthly Retainer

**Date:** 2026-03-24
**Status:** Accepted
**Decider:** Founder

---

## Context

Solo founder ต้องการ:
1. เงินก้อนแรกเร็ว (short-term cashflow)
2. รายได้สม่ำเสมอทุกเดือน (long-term stability)
3. ราคาที่ SME ไทยจ่ายได้จริง

---

## Options ที่พิจารณา

| Model | ข้อดี | ข้อเสีย |
|---|---|---|
| One-time license | เงินก้อนใหญ่ครั้งเดียว | ไม่มี recurring, ต้องหา client ใหม่ตลอด |
| Pure subscription | predictable income | เริ่มต้นช้า, client ลองใช้แล้วเลิกง่าย |
| **Setup + Monthly** | ได้ทั้งก้อนและ recurring | setup ต้องสมเหตุสมผล |
| Usage-based | fair | complex ต่อ SME ไทย |

---

## Decision

**Setup Fee + Monthly Retainer**

---

## Structure

### Setup Fee (จ่ายครั้งเดียว)
```
ครอบคลุม:
  - Config ระบบตาม client (FB, LINE, roles, products)
  - Seed data (employees, courses, inventory)
  - Deploy to Vercel + domain setup
  - Training session 2-3 ชั่วโมง
  - Documentation เฉพาะ client

ราคา: 15,000 – 25,000 บาท
  (ขึ้นกับ complexity: จำนวน users, modules ที่ใช้)
```

### Monthly Retainer
```
ครอบคลุม:
  - Hosting & infrastructure (Vercel + Supabase + Upstash)
  - Bug fixes (response < 24 ชั่วโมง)
  - Minor updates (≤ 4 ชั่วโมง/เดือน)
  - Support ทาง LINE/chat

Plan Starter (< 30 นักเรียน/เดือน): 3,000 บาท/เดือน
Plan Pro (unlimited):                 5,000 บาท/เดือน
```

---

## Rationale

### ทำไม Setup Fee ถึงสำคัญ

1. **กรอง client จริง** — คนที่จ่าย setup fee มักใช้ระบบจริงและ churn น้อย
2. **Cover time ที่ใช้** — onboarding ใช้เวลา 1-2 วันทำงาน
3. **Cashflow ทันที** — ไม่ต้องรอ 6 เดือนกว่า subscription จะ break even

### ทำไม Monthly ถึง 3,000-5,000 บาท

| เทียบกับ | ราคา |
|---|---|
| พนักงาน part-time 1 คน | 8,000-15,000 บาท/เดือน |
| ค่า Line OA Premium | 1,200 บาท/เดือน |
| ค่า accounting software | 500-2,000 บาท/เดือน |
| **Zuri ทำแทนได้ทั้งหมด** | **3,000-5,000 บาท/เดือน** |

---

## Revenue Projection

```
Month 1-2:  2 clients × 20,000 setup     = 40,000 บาท (one-time)
Month 3+:   2 clients × 5,000/เดือน      = 10,000 บาท/เดือน
Month 6:    5 clients × 5,000/เดือน      = 25,000 บาท/เดือน
Month 12:   8 clients × 5,000/เดือน      = 40,000 บาท/เดือน
            + setup fees from new clients  = variable

Net หลังหัก infra (~1,000/client/เดือน):
  8 clients × 4,000 net                  = 32,000 บาท/เดือน ✅
```

---

## Consequences

- **บวก:** cashflow เร็ว, client serious, recurring stable
- **ลบ:** setup fee อาจเป็น barrier สำหรับบางราย
- **แก้ด้วย:** เสนอ installment — setup แบ่ง 2 งวด (ก่อน + หลัง go-live)
