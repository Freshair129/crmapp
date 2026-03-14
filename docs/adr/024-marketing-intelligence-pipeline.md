# ADR 024: Marketing Intelligence Pipeline — Bottom-Up Aggregation, Checksum & Hourly Ledger

## Status
Implemented (2026-03-09)
Updated (2026-03-11): Phase 7 fix implemented to support Daily Breakdown in `AdDailyMetric`.
## Context
ระบบ Marketing Analytics ปัจจุบันซิงค์ข้อมูลจาก Meta API ในระดับ Ad แต่ยังขาด:

1. **Hierarchical Aggregation**: ค่า Campaign / AdSet รับมาจาก Meta API ตรงๆ ไม่ได้คำนวณ Bottom-Up จาก Ad level — ทำให้ไม่สามารถตรวจ Checksum ได้
2. **Data Integrity Verification**: ไม่มีการตรวจว่า `Sum(Ads.spend) == Campaign.spend` — ช่องว่างเหล่านี้ทำให้ ROAS คลาดเคลื่อน
3. **Hourly Trend Visualization**: ข้อมูล hourly ถูกอัปเดตทับแทนที่แทนที่จะสะสมเป็น Ledger — ทำให้ไม่สามารถ plot กราฟ trend รายชั่วโมงได้
4. **Derived Metrics**: ยังไม่มี CON (Conversion Efficiency = Transactions / CPR) และ Bottom-Up ROAS ระดับ Ad

## Decision

### D1: Ad-Level First Strategy
ดึงข้อมูลจาก Meta API ในระดับ **Ad เป็นหลัก** (ไม่ใช่ Campaign) เพื่อ:
- ทำ Product Attribution ต่อ Ad ได้
- คำนวณ Checksum ย้อนกลับได้

### D2: Bottom-Up Hierarchical Aggregation
```
L1: Ad       → คำนวณจากข้อมูล raw Meta API
L2: AdSet    → Sum(Ads ใน AdSet)
L3: Campaign → Sum(AdSets ใน Campaign)
```
ผลลัพธ์ L2, L3 คำนวณใน application layer ไม่ใช่ดึงจาก Meta ตรงๆ

### D3: Checksum Verification (FR4.8)
หลังทุก sync รอบ:
```
Rule: Sum(Ads.metrics) == Campaign.metrics (จาก Meta)
If mismatch → log DataIntegrityError + continue (ไม่ block)
```
เก็บผลใน `MarketingChecksum` table หรือ log file

### D4: Hourly Persistence Ledger (FR4.7)
สร้าง table `AdHourlyLedger` เพิ่มเติมจาก `AdHourlyMetric`:
- `AdHourlyMetric` = snapshot ล่าสุด (อัปเดตทับ)
- `AdHourlyLedger` = append-only log ต่อชั่วโมง (สำหรับกราฟ trend)
- Delta Rule: บันทึกเฉพาะถ้า `delta != 0`

### D5: Derived Metrics (FR4.5)
```
CON  = totalTransactions / costPerResult
CPA  = totalSpend / totalTransactions
ROAS = totalRevenue / totalSpend
```
คำนวณ on-the-fly ใน API layer ไม่เก็บใน DB (computed field)

### D6: Intelligent Differential Sync (FR4.9)
- Hourly: ดึงเฉพาะ Ads ที่ `effective_status: ['ACTIVE']` และ `updated_time > last_sync`
- Daily 00:00-01:00: Full Sync เพื่อ reset Baseline

## Consequences
**Pros:**
- ROAS และ Spend แม่นยำขึ้น (checksum detect gaps)
- กราฟ trend รายชั่วโมงทำได้จริง
- ลด Meta API calls จาก Differential Sync

**Cons:**
- เพิ่ม `AdHourlyLedger` table (storage เพิ่มขึ้น)
- Aggregation logic ซับซ้อนขึ้นใน application layer

**Risk:**
- Meta API อาจคืนค่า Campaign total ต่างจาก Sum(Ads) เล็กน้อยเนื่องจาก rounding — ต้องกำหนด tolerance margin (±1%)
