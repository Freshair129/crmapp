# ADR 028: Facebook Messaging Integration — Webhook + Graph API Polling

## Status
Implemented (2026-03-09)

## Context
ระบบต้องการรับ-ส่งข้อความกับลูกค้าผ่าน Facebook Messenger และบันทึกประวัติการสนทนาลง DB:

1. **Real-time Webhook**: รับ incoming messages จาก Meta ทันที — ต้องตอบกลับ < 200ms (NFR1)
2. **Historical Backfill**: ดึงประวัติย้อนหลัง 90 วัน ผ่าน Graph API polling
3. **Agent Attribution**: sync_agents_v2.js (Playwright) อ่าน "ส่งโดย [ชื่อ]" แล้ว match กับ Employee — ต้องการ API endpoint รองรับ
4. **Identity Resolution**: Upsert Customer by PSID, เชื่อม Conversation, บันทึก Message พร้อม metadata (ad referral)

## Decision

### D1: Webhook Handler (NFR1 — < 200ms)
```
GET  /api/webhooks/facebook  → verify_token challenge
POST /api/webhooks/facebook  → ตอบ 200 ทันที → fire-and-forget processEvent()
```
- `processEvent()` ทำงาน async หลัง response
- ทุก DB operation ใน `prisma.$transaction` (NFR5)
- Upsert Customer by `psid` → Upsert Conversation → Upsert Message

### D2: Graph API Historical Polling (`scripts/sync-fb-messages.mjs`)
- Polls `/{PAGE_ID}/conversations?platform=messenger`
- ดึง participants + messages (paginated) ถึง 90-day cutoff
- `ON CONFLICT (message_id) DO NOTHING` — idempotent
- รันด้วย `node scripts/sync-fb-messages.mjs` (standalone, ไม่ผ่าน auth)

### D3: Agent Attribution Endpoint
```
POST /api/marketing/chat/message-sender
Body: { name, msgId?, msgText?, convId? }
```
Priority match:
1. `identities->'facebook'->>'name' ILIKE name` (JSONB query)
2. `nickName ILIKE name`
3. `firstName ILIKE name` / `lastName ILIKE name`

Updates `messages.responder_id` — ใช้โดย sync_agents_v2.js

### D4: Message Schema
```
message_id    String   @unique  ← Meta message ID (mid.$...)
conversation_id UUID   ← FK → Conversation
sender_psid   String            ← PSID ของผู้ส่ง
text          String?
attachments   Json?             ← [{type, url}]
ad_referral   Json?             ← {ad_id, source, type}
responder_id  UUID?             ← FK → Employee (attribution)
timestamp     DateTime
```

## Consequences
**Pros:**
- Real-time messaging + historical backfill ครบ
- Agent attribution ทำงานร่วมกับ Playwright scraper โดยไม่ต้องแตะ login session
- Webhook compliant NFR1 (< 200ms)

**Cons:**
- Graph API polling สำหรับ historical data ต้องรอ rate limit (90-day window)
- sync_agents_v2.js ต้อง call endpoint หลัง scrape ทุกครั้ง

**Risk:**
- Meta access token หมดอายุ 60 วัน — ต้องมี Long-lived token refresh process
- `processEvent()` error ไม่ส่งผลต่อ webhook response — ต้อง monitor logs
