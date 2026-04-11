# ADR-051: Product Pivot — V School CRM → Zuri (Vertical SaaS)

**Date:** 2026-03-24
**Status:** Accepted
**Decider:** Founder (Pornpol)
**Supersedes:** ไม่มี — เป็น strategic decision ระดับ product

---

## Context

crmapp ถูกสร้างขึ้นเพื่อเป็น custom CRM สำหรับ The V School (โรงเรียนสอนทำอาหารญี่ปุ่น, กรุงเทพฯ) โดยเฉพาะ

หลังจาก 38+ phases และ v2.2.0 ระบบมีความสมบูรณ์เพียงพอที่จะ:
1. ขายให้ธุรกิจอื่นในวงการเดียวกัน (culinary schools, restaurants)
2. กลายเป็น product มากกว่า custom software

Founder ต้องการสร้างรายได้ 30,000 บาท/เดือน net จาก recurring subscription
โดยทำงานคนเดียว ไม่มีทีม

---

## Decision

**Pivot codebase นี้เป็น "Zuri"** — Vertical SaaS สำหรับ culinary school + food business ในไทย

V School ยังคงเป็นลูกค้า (tenant แรก) ไม่ใช่ identity ของ product อีกต่อไป

---

## What Changes

| มิติ | Before | After |
|---|---|---|
| Product name | V School CRM v2 | **Zuri** |
| Identity | custom software สำหรับ V School | Vertical SaaS สำหรับ culinary + food business |
| V School role | เจ้าของ product | ลูกค้าคนแรก (reference client) |
| Codebase | ไม่เปลี่ยน | ไม่เปลี่ยน — ใช้เดิมทั้งหมด |
| Business logic | ไม่เปลี่ยน | ไม่เปลี่ยน |
| Branding | V School colors/logo | Zuri CI (logo, colors, favicon) |
| CLAUDE.md | "V School CRM v2" | "Zuri" + V School เป็น client |

## What Does NOT Change

- โค้ดทั้งหมด — ไม่แตะ
- Database schema — ไม่แตะ
- API routes — ไม่แตะ
- V School deployment — ยังคงทำงานปกติ
- Tech stack — ไม่แตะ

---

## Brand Rationale

**ชื่อ Zuri** มาจาก 2 แหล่ง:
1. Swahili: "beautiful, good, excellent"
2. ตัวละครจากซีรีส์ Marry is Happy — เพื่อนที่คอยช่วยเหลือตลอด ทำให้เกิด insight ว่า "อยากมีซูริเป็นของตัวเอง" → ระบบที่เป็นเพื่อนช่วยเหลือธุรกิจตลอดเวลา

**Tagline:** "Your business's best friend" / "มีซูริ ไม่ต้องเป็นห่วง"

---

## Multi-tenant Architecture

```
Zuri codebase (shared)
├── clients/
│   └── vschool/          ← V School config + seed
│       ├── .env.example
│       └── seed.js
└── [future clients]

Deploy model:
  1 client = 1 Vercel project + 1 Supabase project
  แยก env vars ต่อ client → data isolation สมบูรณ์
```

---

## Strategic Rationale

- **Solo founder ceiling** — 8-10 clients × 5,000/เดือน = 40,000-50,000 บาท net
- **No additional dev** — product พร้อมขายแล้ว ณ v2.2.0
- **V School = live demo** — demo กับลูกค้าใหม่ได้ทันที
- **Market gap** — ไม่มีคู่แข่งในไทยที่ทำ culinary school + ops ในที่เดียว

---

## Related Documents

- `docs/zuri/CONCEPT.md` — Brand story + positioning
- `docs/zuri/OVERVIEW.md` — Product features + roadmap
- `docs/zuri/adr/001` → `004` — Zuri-level strategic ADRs
- `docs/adr/052-zuri-ci-integration.md` — (planned) Branding implementation

---

## Consequences

- **บวก:** monetize งานที่ทำมาได้ทันที, ไม่ต้องสร้างใหม่, V School ยัง active
- **ลบ:** ต้องแยก V School config ออกจาก codebase (minor refactor)
- **ยอมรับ:** Zuri docs อยู่ใน `docs/zuri/` แยกจาก V School ADRs (024–050)
