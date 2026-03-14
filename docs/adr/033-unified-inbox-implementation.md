# ADR-033 — Unified Inbox Implementation (Facebook + LINE)

**Date:** 2026-03-13
**Status:** Accepted
**Deciders:** Lead (Claude), Implementation (Gemini)

---

## Context

ระบบเดิมมีการรวมข้อมูลแชทจาก Facebook และ LINE แยกกันอยู่ใน DB แต่ยังไม่มี UI เดียวที่สามารถจัดการทั้งสองช่องทางพร้อมกันได้ (Unified Inbox) การสลับหน้าไปมาทำให้ Admin ทำงานช้า

---

## Decision

สร้าง `UnifiedInbox.js` เป็นศูนย์กลางการสื่อสาร โดยมีคุณสมบัติดังนี้:

1.  **Cross-Platform Listing**: ดึงข้อมูลจาก `Conversation` table ที่รวมทั้ง Facebook และ LINE โดยใช้ `channel` indicator
2.  **Server-Side Filtering**: รองรับการกรองตาม Channel (ALL, FB, LINE) และ Status (Open, Pending, Closed) ผ่าน API query parameters
3.  **Pagination**: โหลดข้อมูลทีละ 10 รายการเพื่อให้ UI ลื่นไหล (Infinite Scroll / Load More)
4.  **Real-time Continuity**: เมื่อมีการส่งข้อความใหม่ ให้ refresh ลำดับการสนทนาในแถบข้างทันที
5.  **Status Machine Integration**: ให้สามารถเปลี่ยนสถานะแชทได้โดยตรงจาก UI

---

## Technical Details

- **API Route (Conversations)**: `GET /api/inbox/conversations` — ดึงรายชื่อบทสนทนาล่าสุด พร้อมข้อความสุดท้าย
- **API Route (Messages)**: `GET /api/inbox/conversations/[id]/messages` — ดึงประวัติข้อความแบบ Paginated
- **Reply System**: `POST /api/inbox/conversations/[id]/messages` — สำหรับส่งข้อความตอบกลับ
- **Constraint**: `Customer` model **ไม่มี field `channel`** — ต้องอ้างอิงจาก `Conversation.channel` เท่านั้น

---

## Consequences

**Positive:**
- Admin ทำงานที่เดียวจบ (Single Pane of Glass)
- ลดความซับซ้อนของ UI โดยการรวมระบบแชทไว้ที่เดียวกัน
- รองรับการขยายตัวไปยังช่องทางอื่นในอนาคต (e.g., WhatsApp, Instagram)

**Negative:**
- ความซับซ้อนของ API เพิ่มขึ้นในการทำ Join ข้อมูล
- ต้องการการจัดการ State ที่ดีเพื่อป้องกันการสลับแชทแล้วข้อมูลตกหล่น
