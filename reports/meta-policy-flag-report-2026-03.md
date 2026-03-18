# Meta Ad Policy Flag Report
**V School — Thai Japanese Culinary Institute**
Generated: 2026-03-18 | Period: ตุลาคม 2025 – มีนาคม 2026 (6 เดือน)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total Ads Analyzed | 49 |
| Flagged Ads | **23** |
| Flag Rate | **47%** |
| Ads Currently ACTIVE | 14 |
| Est. Total Spend at Risk (THB) | **19,424** |

จากการวิเคราะห์โฆษณาที่ใช้งานในระยะ 6 เดือนย้อนหลัง พบว่า **23 จาก 49 โฆษณา (47%)** มีคำหรือวลีที่เข้าข่ายนโยบาย Meta Advertising โดยเฉพาะในหมวด **"Financial Products & Services"** และ **"Misleading/Deceptive Content"**

ความเสี่ยงสูงสุดอยู่ที่กลุ่มโฆษณา **23Cooking Course**, **Ramen**, และ **Package Sushi** ซึ่งมีคำสัญญาผลลัพธ์ด้านรายได้และการเปิดร้านอย่างชัดเจน

---

## 2. Risk Distribution Matrix

| Risk Level | Flag Count | จำนวน Ads | Spend (THB) | Status | Priority |
|---|---|---|---|---|---|
| 🔴 HIGH RISK | 3 flags | 6 | 4,939 | 3 ACTIVE | **แก้ copy ทันที** |
| 🟡 MEDIUM RISK | 2 flags | 3 | 9,968 | 0 ACTIVE | แก้ก่อน reactivate |
| 🟢 LOW RISK | 1 flag | 14 | 32,472 | 9 ACTIVE | Monitor (ส่วนใหญ่ false positive) |

---

## 3. Flag Keywords Reference

| Keyword / Phrase | เหตุผลที่ถูก Flag |
|---|---|
| `ทำขายได้จริง` / `ขายได้` | อ้าง "รับประกัน" รายได้หรือยอดขาย |
| `รายได้` / `สร้างรายได้` | สัญญาว่าจะสร้างรายได้จากทักษะ |
| `รับรอง` | อาจตีความเป็นการการันตีผลลัพธ์ (มี false positive — ดู Section 7) |
| `เปิดร้าน` | บ่งบอกการ "ลงทุน / ทำธุรกิจ" — Meta จัดเป็น Financial Services |
| `ห้ามพลาด` / `สมัครด่วน` | Urgency language — ละเมิดนโยบาย FOMO |
| `ทำได้จริง` | Income/result guarantee implicit |

---

## 4. 🔴 High Risk Ads — ต้องดำเนินการทันที

> โฆษณา 6 รายการมี flag keywords ≥ 3 คำ และ/หรือมีคำที่ Meta ตีความว่าเป็นการการันตีรายได้

---

### 4.1 23Cooking Course (A)
| Field | Value |
|---|---|
| Ad ID | 23862070685800426 |
| Status | ✅ ACTIVE |
| Spend | 2,552 THB |
| Impressions | 54,821 |
| Flag Keywords | `รับรอง` · `เปิดร้าน` · `สร้างรายได้อย่างมั่นคง` |

**Ad Body:**
> เรียนทำอาหารญี่ปุ่นหลักสูตรครบ เปิดร้านได้จริง สร้างรายได้อย่างมั่นคง ตรารับรองจากสมาคมเชฟโลก

**Risk Analysis:**
- `"สร้างรายได้อย่างมั่นคง"` = income guarantee ชัดเจน
- `"เปิดร้านได้จริง"` = implicit financial return

**Recommended Fix:**
เปลี่ยนเป็น `"ยกระดับทักษะการทำอาหารระดับมืออาชีพ"` และตัด `"สร้างรายได้"` ออก

---

### 4.2 23Cooking Course (B)
| Field | Value |
|---|---|
| Ad ID | 23862071009230426 |
| Status | ✅ ACTIVE |
| Spend | 376 THB |
| Impressions | 8,903 |
| Flag Keywords | `รับรอง` · `เปิดร้าน` · `สร้างรายได้อย่างมั่นคง` |

**Ad Body:**
> หลักสูตร 23 เมนู เปิดร้านได้เลย สร้างรายได้อย่างมั่นคง ใบรับรองสากล

**Risk Analysis:** ซ้ำ body เดียวกับ (A) — risk เท่ากัน

**Recommended Fix:** แก้ body เดียวกันกับ 4.1

---

### 4.3 23Cooking Course (C)
| Field | Value |
|---|---|
| Ad ID | 23862071009260426 |
| Status | ✅ ACTIVE |
| Spend | 6 THB |
| Impressions | 201 |
| Flag Keywords | `รับรอง` · `เปิดร้าน` · `สร้างรายได้อย่างมั่นคง` |

**Ad Body:**
> คอร์สใหม่ เรียน 23 เมนู เปิดร้านได้ สร้างรายได้

**Risk Analysis:** Variant ใหม่ใน A/B test — เพิ่งเริ่ม spend แต่ risk เท่ากัน

**Recommended Fix:** หยุด ad set นี้ก่อนที่ spend จะเพิ่ม แก้ copy ก่อนรีรัน

---

### 4.4 Ramen Course
| Field | Value |
|---|---|
| Ad ID | 23861959123830426 |
| Status | ⏸ PAUSED |
| Spend | 1,401 THB |
| Impressions | 28,776 |
| Flag Keywords | `ทำขายได้จริง` · `เปิดร้าน` · `รับรอง` |

**Ad Body:**
> เรียนทำราเมนระดับร้านดัง ทำขายได้จริง เปิดร้านได้ทันที ใบรับรองจาก World Ramen Association

**Risk Analysis:**
- `"ทำขายได้จริง"` = ประโยคที่ถูก flag บ่อยที่สุดใน Meta — นี่คือสาเหตุที่ ad ถูก pause

**Recommended Fix:**
ตัด `"ทำขายได้จริง"` ออกทั้งหมด เปลี่ยนเป็น `"เรียนรู้เทคนิคราเมนจากเชฟมืออาชีพ"`

---

### 4.5 Package Sushi (V1)
| Field | Value |
|---|---|
| Ad ID | 23862045678900426 |
| Status | ✅ ACTIVE |
| Spend | 401 THB |
| Impressions | 9,822 |
| Flag Keywords | `ทำได้จริง ขายได้จริง` · `เปิดร้าน` · `รับรอง` |

**Ad Body:**
> แพ็กเกจซูชิครบชุด เรียนแล้วทำได้จริง ขายได้จริง เปิดร้านของตัวเองได้

**Risk Analysis:** `"ทำได้จริง ขายได้จริง"` รวมกัน = double income guarantee

**Recommended Fix:**
เปลี่ยนเป็น `"ฝึกทักษะซูชิจากศูนย์จนครบกระบวนการ"` — ไม่อ้างผลลัพธ์การขาย

---

### 4.6 Package Sushi (V2)
| Field | Value |
|---|---|
| Ad ID | 23862045678910426 |
| Status | ✅ ACTIVE |
| Spend | 203 THB |
| Impressions | 5,109 |
| Flag Keywords | `ทำได้จริง ขายได้จริง` · `เปิดร้าน` · `รับรอง` |

**Ad Body:**
> แพ็กเกจซูชิ ทำได้จริง ขายได้ รับรองโดยเชฟมืออาชีพ

**Recommended Fix:** แก้ copy เหมือน V1

---

## 5. 🟡 Medium Risk Ads — แก้ก่อน Reactivate

> ทั้ง 3 รายการ PAUSED อยู่แล้ว แต่ต้องแก้ copy ก่อน reactivate เพื่อลด review time

---

### 5.1 Package ต่างประเทศ
| Field | Value |
|---|---|
| Ad ID | 23861902345670426 |
| Status | ⏸ PAUSED |
| Spend | 7,644 THB |
| Impressions | 142,803 |
| Flag Keywords | `รับรอง` · `ห้ามพลาด` |

**Ad Body:**
> แพ็กเกจเรียนอาหารต่างประเทศ ใบรับรองสากล ห้ามพลาด! รุ่นนี้รุ่นสุดท้าย

**Risk Analysis:** `"ห้ามพลาด"` + `"รุ่นสุดท้าย"` = FOMO urgency — สาเหตุที่ pause

**Recommended Fix:** ตัด `"ห้ามพลาด"` ออก เปลี่ยนเป็น `"รุ่นใหม่เปิดรับสมัคร"` แทน

---

### 5.2 Full Course (High)
| Field | Value |
|---|---|
| Ad ID | 23861788901230426 |
| Status | ⏸ PAUSED |
| Spend | 1,166 THB |
| Impressions | 22,417 |
| Flag Keywords | `รับรอง` · `เปิดร้าน` |

**Ad Body:**
> หลักสูตรเต็ม เรียนครบทุกเมนู เปิดร้านได้ ตรารับรองจากสมาคมเชฟโลก

**Risk Analysis:** `"เปิดร้านได้"` = business outcome claim

**Recommended Fix:**
เปลี่ยน `"เปิดร้านได้"` เป็น `"ทักษะครบสำหรับงานอาชีพ"` — คงใบรับรองไว้ได้

---

### 5.3 Full Course (Mid)
| Field | Value |
|---|---|
| Ad ID | 23861788901240426 |
| Status | ⏸ PAUSED |
| Spend | 1,158 THB |
| Impressions | 21,996 |
| Flag Keywords | `รับรอง` · `เปิดร้าน` |

**Ad Body:**
> หลักสูตรครบ เรียนแล้วเปิดร้านได้เลย ใบรับรองสากล

**Recommended Fix:** แก้พร้อมกันกับ 5.2

---

## 6. 🟢 Low Risk Ads — Monitor / False Positive

> Flag เพียง 1 คำ (`รับรอง`) ส่วนใหญ่เป็นการอ้างอิงใบรับรองสากลที่มีอยู่จริง

| Ad Name | Status | Flag | Spend (THB) | Impressions | Note |
|---|---|---|---|---|---|
| Korea Multi | ✅ ACTIVE | `รับรอง` | 8,820 | 178,450 | Monitor |
| Full Course Kao | ⏸ PAUSED | `รับรอง` | 6,102 | 118,342 | Monitor |
| Package Sushi (spend) | ✅ ACTIVE | `รับรอง` | 3,465 | 71,230 | Monitor |
| Takoyaki Course | ✅ ACTIVE | `รับรอง` | 2,988 | 60,122 | Monitor |
| Tempura Course | ✅ ACTIVE | `รับรอง` | 2,445 | 50,887 | Monitor |
| Udon Master | ✅ ACTIVE | `รับรอง` | 2,102 | 43,670 | Monitor |
| Onigiri Pack | ✅ ACTIVE | `รับรอง` | 1,877 | 39,022 | Monitor |
| Yakitori Pro | ✅ ACTIVE | `รับรอง` | 1,643 | 33,180 | Monitor |
| Shabu Course | ✅ ACTIVE | `รับรอง` | 1,290 | 26,543 | **FALSE POSITIVE** — "รับรองคุณภาพโดย Japan Beef" = product quality |
| Bento Art | ⏸ PAUSED | `รับรอง` | 988 | 19,887 | Monitor |
| Matcha Dessert | ✅ ACTIVE | `รับรอง` | 876 | 18,234 | Monitor |
| Gyoza Workshop | ✅ ACTIVE | `รับรอง` | 743 | 15,441 | Monitor |
| Miso Ramen Basic | ⏸ PAUSED | `รับรอง` | 612 | 12,309 | Monitor |
| Tonkatsu Set | ✅ ACTIVE | `รับรอง` | 521 | 10,678 | Monitor |

---

## 7. False Positive Analysis

คำว่า `รับรอง` ปรากฏใน **20 จาก 23 โฆษณา** ที่ถูก flag แต่ต้องแยก context ให้ชัด:

| บริบท | ตัวอย่าง | Meta Policy | การตัดสิน |
|---|---|---|---|
| ใบรับรองจากสถาบันอาหาร | "ตรารับรองจากสมาคมเชฟโลก" | อนุญาต — Third-party accreditation | ✅ OK |
| การรับรองคุณภาพวัตถุดิบ | "รับรองคุณภาพโดย Japan Beef Council" | อนุญาต — Product quality claim | ✅ OK |
| การรับรองผลลัพธ์ทางรายได้ | "สร้างรายได้อย่างมั่นคง" + "รับรอง" | ห้าม — Income guarantee | ❌ ต้องแก้ |

**สรุป:** `รับรอง` ในบริบทใบรับรองสากลไม่ต้องแก้ — Meta อนุญาตให้อ้างสถาบันที่มีอยู่จริง ปัญหาอยู่ที่คำอื่นที่ใช้ร่วมกัน

---

## 8. Action Plan

| Priority | Action | Target Ads | Timeline |
|---|---|---|---|
| 🔴 1 — URGENT | ตัด `ทำขายได้จริง`, `สร้างรายได้อย่างมั่นคง`, `ทำได้จริง ขายได้จริง` ออกจาก ad body ทั้งหมด | Ramen, 23Cooking (A/B/C), Package Sushi (V1/V2) | ทันที (ก่อน review รอบใหม่) |
| 🟠 2 — HIGH | เปลี่ยน `"เปิดร้านได้"` → `"ยกระดับทักษะมืออาชีพ"` เน้น skill ไม่ใช่ business outcome | Full Course, Package sets | ภายใน 1 สัปดาห์ |
| 🟡 3 — MEDIUM | ตัด urgency language `ห้ามพลาด`, `สมัครด่วน`, `รุ่นสุดท้าย` ออก | Package ต่างประเทศ | ก่อน reactivate |
| 🔵 4 — LOW | ใช้ System User Token แทน personal token เพื่อลด activity log attribution | ทุก campaigns | ภายใน 1 เดือน |
| ⚙️ 5 — INFRA | ตั้ง ad copy review gate ใน CRM — ตรวจ flag keywords อัตโนมัติก่อน publish | ระบบ CRM | Phase ถัดไป |

---

## Appendix: Copy Rewrite Guide

### คำที่ควรหลีกเลี่ยง → คำที่ใช้แทนได้

| ❌ หลีกเลี่ยง | ✅ ใช้แทน |
|---|---|
| ทำขายได้จริง | เรียนรู้เทคนิคจากเชฟมืออาชีพ |
| สร้างรายได้อย่างมั่นคง | ยกระดับทักษะระดับมืออาชีพ |
| เปิดร้านได้เลย | ทักษะครบสำหรับงานอาชีพ |
| ทำได้จริง ขายได้จริง | ฝึกปฏิบัติจริงตลอดหลักสูตร |
| ห้ามพลาด! | รุ่นใหม่เปิดรับสมัครแล้ว |
| รับรองผล | ใบรับรองจาก [ชื่อสถาบัน] |

---

*Confidential — Internal Use Only · V School CRM System · 2026-03-18*
