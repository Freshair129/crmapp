# ADR-043: Fuzzy Thai Name Matching

**Status:** Accepted
**Date:** 2026-03-20
**Author:** Claude (Lead Architect)

## Context

ระบบปัจจุบันใช้ exact match (case-insensitive) สำหรับค้นหาและ resolve ชื่อในทุกจุด:

| จุดใช้งาน | ไฟล์ | วิธี match ปัจจุบัน | ปัญหา |
|---|---|---|---|
| Customer search (API) | `customerRepo.js`, `customers/route.js` | `contains` (substring) | พิมพ์ "สมชาย" หา "สมชาย​นวล" ได้ แต่พิมพ์ "สมชาญ" ไม่เจอ |
| Customer search (UI) | `CustomerList.js` | `toLowerCase().includes()` | เหมือนข้างบน — typo = หายเลย |
| Employee resolution | `agentSyncRepo.js` | `ILIKE` (exact) / `equals` (insensitive) | "บอส" vs "Boss" vs "บ๊อส" ไม่ match |
| Identity resolve | `identityService.js` | ไม่ match ชื่อเลย (ใช้ PSID/lineId/phone) | ไม่มีผลโดยตรง แต่ไม่สามารถ merge ด้วยชื่อได้ |

### Thai Name Edge Cases ที่ต้องรองรับ

1. **สระ/วรรณยุกต์ผิด:** "สมชาย" vs "สมชาญ", "บอส" vs "บ๊อส" vs "บ็อส"
2. **ชื่อเล่น ≠ ชื่อจริง:** Facebook ใช้ "Boss Suanranger" แต่ DB เก็บ firstName="สุรเชษฐ์"
3. **สลับ first/last:** "สมชาย นวล" vs "นวล สมชาย"
4. **มี/ไม่มี นามสกุล:** "สมชาย" vs "สมชาย นวลจันทร์"
5. **Thai ↔ English transliteration:** "บอส" ≠ "Boss", "แอน" ≠ "Ann"
6. **Zero-width characters:** Facebook ชอบแทรก `\u200B` (zero-width space) ใน Thai text
7. **ช่องว่างซ้ำ/นำ/ตาม:** "  สมชาย  นวล  " → "สมชาย นวล"
8. **สระลอย / ตัวการันต์:** "เชษฐ์" vs "เชษฐ" (ตัด ์ ออก)

## Decision

### D1: สร้าง `src/lib/thaiNameMatcher.js` — Zero-dependency fuzzy matching module

เลือกใช้ **multi-strategy scoring** แทน single algorithm เพราะ Thai text มี property ต่างจาก Latin:

```
Score = max(
  exactMatch(a, b),           // 1.0 ถ้าตรงเป๊ะหลัง normalize
  containsMatch(a, b),        // 0.85 ถ้า a อยู่ใน b หรือ b อยู่ใน a
  tokenOverlap(a, b),         // Jaccard similarity ของ token set
  bigramSimilarity(a, b),     // Dice coefficient ของ character bigrams
  thaiPhoneticMatch(a, b)     // 0.9 ถ้า phonetic form ตรง
)
```

### D2: Thai Text Normalization (ขั้นแรกก่อนทุก comparison)

```
1. Strip zero-width characters (\u200B, \u200C, \u200D, \uFEFF)
2. Collapse multiple whitespace → single space
3. Trim leading/trailing whitespace
4. Lowercase (สำหรับ Latin portion)
5. Strip Thai tonal marks (่ ้ ๊ ๋) → optional "phonetic mode"
6. Strip การันต์ (์) → optional "phonetic mode"
```

### D3: Thai Phonetic Simplification (Lossy — ใช้เฉพาะ fuzzy mode)

ลดรูป Thai characters ที่ออกเสียงคล้ายกัน:

| Group | Characters | Simplified |
|---|---|---|
| ค-equivalent | ข, ฃ, ค, ฅ, ฆ | ค |
| จ-equivalent | ฉ, ช, ฌ | ช |
| ท-equivalent | ฐ, ฑ, ฒ, ถ, ท, ธ | ท |
| ส-equivalent | ศ, ษ, ส | ส |
| น-equivalent (ตัวสะกด) | ณ, น | น |
| ล-equivalent | ล, ฬ | ล |
| พ-equivalent | ผ, พ, ภ | พ |
| บ-equivalent | ป, บ | บ |

> หมายเหตุ: กลุ่มนี้เป็น approximation สำหรับ "ชื่อคน" ไม่ใช่ NLP เต็มรูปแบบ

### D4: Integration Points

| จุด | วิธีใช้ | threshold |
|---|---|---|
| `customerRepo.getAllCustomers` | เพิ่ม `fuzzySearch` mode — query กว้างขึ้น แล้ว re-rank ด้วย score | ≥ 0.6 |
| `agentSyncRepo.resolveEmployeeByName` | เพิ่ม fuzzy fallback เมื่อ exact match ไม่เจอ | ≥ 0.8 (สูงกว่าเพราะ attribution ต้องแม่นยำ) |
| `GET /api/customers?search=` | ใช้ fuzzy mode เมื่อ exact match return 0 results | ≥ 0.6 |
| `CustomerList.js` (client-side filter) | ใช้ normalize + contains เป็นหลัก, fuzzy เป็น optional | ≥ 0.5 |

### D5: Threshold Rationale

| Score | ความหมาย | ตัวอย่าง |
|---|---|---|
| 1.0 | Exact match (หลัง normalize) | "สมชาย" = "สมชาย" |
| 0.9 | Phonetic match | "เชษฐ์" ≈ "เชษฐ" |
| 0.85 | Contains match | "สมชาย" ⊂ "สมชาย นวล" |
| 0.7 | High bigram overlap | "สมชาย" ~ "สมชาญ" |
| 0.5 | Partial token overlap | "Boss สมชาย" ~ "สมชาย นวล" |
| < 0.4 | No match | "สมชาย" ≠ "มาลี" |

### D6: Performance Constraints

- **ไม่ใช้ external library** — zero dependency, ลด bundle size
- **Customer fuzzy search**: query DB ด้วย trigram/prefix กว้างๆ ก่อน (max 100 rows) แล้ว score ใน JS
- **Employee resolution**: มี ~20-50 employees → load all แล้ว score ใน memory ได้
- **ไม่ใช้ pg_trgm extension** — Supabase free tier อาจจำกัด extensions

## Consequences

### Positive
- ลูกค้าค้นหาชื่อที่สะกดผิดเล็กน้อยได้
- Agent attribution จาก Playwright scraper แม่นยำขึ้น (ชื่อ Facebook ≠ ชื่อในระบบ)
- Zero-width character จาก Facebook ไม่ทำให้ match พัง
- ไม่เพิ่ม dependency ใน production

### Negative
- Thai phonetic simplification เป็น approximation — อาจ false positive สำหรับชื่อที่ต่างกันจริงแต่เสียงคล้าย
- Fuzzy search ช้ากว่า exact (ต้อง post-process ใน JS) — acceptable สำหรับ < 10k customers
- Threshold อาจต้อง tune ตาม real usage

### Risks
- False match ใน employee attribution → assign ผิดคน (mitigated by high threshold 0.8)
- Performance degradation ถ้า customer base โตเกิน 10k → ต้องย้ายไป `pg_trgm` ใน DB

## Related
- ADR-025: Cross-Platform Identity Resolution
- ADR-029: Employee Registry
- `src/lib/identityService.js`
- `src/lib/repositories/agentSyncRepo.js`
- `src/lib/repositories/customerRepo.js`
