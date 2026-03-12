# ADR 030: Executive Analytics — Revenue Split by Channel (Ads vs Store)

## Status
Implemented (2026-03-12)

## Context
Dashboard Executive ก่อนหน้านี้แสดงยอดขายรวมเพียงตัวเดียว ทำให้ไม่สามารถแยกได้ว่า:
1. ยอดขายมาจาก Online Ads (Facebook Messenger → ปิดการขาย) หรือ Walk-in (หน้าร้าน)
2. ประสิทธิภาพของ Ad spend เทียบกับ Walk-in traffic เป็นอย่างไร

## Decision

### D1: Revenue Classification via `conversationId`
ใช้ `Order.conversationId` (nullable FK → Conversation) เป็น signal:
```
conversationId IS NOT NULL  → Ads Revenue  (ลูกค้ามาจาก Facebook/Online)
conversationId IS NULL      → Store Revenue (Walk-in / หน้าร้าน)
```
ไม่ต้องเพิ่ม column ใหม่ — ใช้ field ที่มีอยู่แล้วใน schema

### D2: API Response Shape
`GET /api/analytics/executive?timeframe=<key>` คืน:
```json
{
  "totalRevenue": 20000,
  "revenueAds": 15000,
  "revenueStore": 5000,
  "revenueChange": 12.5,
  "revenueAdsChange": 20.0,
  "revenueStoreChange": -5.0,
  "ordersCount": 8,
  "avgTicket": 2500,
  "activeSessions": 12,
  "conversionRate": 66.7
}
```
% change คำนวณเทียบ previous period เดียวกัน (ผ่าน `getDateRange()`)

### D3: Timeframe Keys (กำหนด standard)
`src/lib/timeframes.js` export `getDateRange(timeframe)` รับ key:
```
today / this_week / this_month / last_month / last_90d / ytd / all_time
```
UI ต้องส่ง key ตาม standard นี้เสมอ (ห้ามส่ง `week` หรือ `month` ที่ไม่ match)

### D4: UI — 4 Stat Cards
| Card | Metric | Color |
|---|---|---|
| Total Revenue | totalRevenue + revenueChange% | Gold (#C9A34E) |
| Ads Revenue | revenueAds + revenueAdsChange% | Blue |
| Store Revenue | revenueStore + revenueStoreChange% | Emerald |
| Orders Count | ordersCount | Indigo |

## Consequences
**Pros:**
- เห็น channel breakdown ทันทีโดยไม่ต้องเพิ่ม DB column
- % change ทุก channel เทียบ period เดียวกัน → วิเคราะห์ trend ได้

**Cons:**
- Walk-in orders ที่ถูกบันทึกแบบมี conversationId (เช่น agent สร้าง order จาก inbox) จะถูกนับเป็น Ads Revenue — ต้องฝึก agent ให้บันทึกถูกต้อง

**Risk:**
- ถ้า `Order.conversationId` ถูก set โดยไม่ตั้งใจ (bug) → revenue ประเภทผิด → ต้องมี audit log
