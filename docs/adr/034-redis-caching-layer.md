# ADR-034 — Redis Caching Layer for Analytics

**Date:** 2026-03-13
**Status:** Accepted
**Deciders:** Lead (Claude), Implementation (Gemini)

---

## Context

หน้า Executive Analytics มีการทำ Aggregation ข้อมูลขนาดใหญ่จาก `Order`, `AdDailyMetric` และ `Conversation` พร้อมกัน การดึงข้อมูลแบบ Real-time ทุกครั้งที่ User โหลดหน้าหรือเปลี่ยน Timeframe (Week/Month/90d) ทำให้เกิด Load บน Database สูงและมี Latency สูง (> 2s ในบางกรณี)

---

## Decision

นำ Redis มาเป็น Caching Layer หลักสำหรับ API ที่มี Cost สูง โดยใช้รูปแบบ **Get-or-Set**:

1.  **Centralized Client**: สร้าง `src/lib/redis.js` เป็น Singleton client โดยใช้ `ioredis`
2.  **Standard Utility**: มี wrapper function `cache.getOrSet(key, fetcher, ttl)` เพื่อลด boilerplate ใน API handlers
3.  **Cache Key Strategy**: ใช้ key ในรูปแบบ `analytics:executive:{timeframe}` เพื่อแยกข้อมูลตามช่วงเวลา
4.  **TTL Configuration**: กำหนดค่าเริ่มต้นเป็น 300 วินาที (5 นาที) สำหรับข้อมูล Analytics ซึ่งเพียงพอสำหรับการวิเคราะห์เชิงบริหาร
5.  **Fail-safe**: หาก Redis เชื่อมต่อไม่ได้ ระบบจะ fallback ไปดึงข้อมูลจาก Database โดยตรง (graceful degradation)

---

## Technical Details

- **Implementation**: ใช้ `JSON.stringify/parse` ในการจัดการข้อมูลที่เก็บใน Redis
- **Handling Next.js Dynamicity**: เพิ่ม `export const dynamic = 'force-dynamic'` ใน API route เพื่อป้องกัน Next.js ทำ static caching ที่ build time เมื่อมีการใช้ custom caching logic

---

## Consequences

**Positive:**
- ลด Latency จากหลักวินาทีเหลือ < 50ms (Cache HIT)
- ลด Resource consumption บน PostgreSQL
- Scalability ดีขึ้น รองรับ Admin หลายคนเข้าดู Dashboard พร้อมกันได้

**Negative:**
- ข้อมูลอาจจะไม่อัปเดตแบบ Real-time ทันที (มี delay สูงสุด 5 นาที)
- เพิ่ม Dependency (Redis) ในโครงสร้างระบบ
