---
name: domain-inbox
description: >
  Context loader for Inbox/Chat domain (3 models, 12+ API routes).
  Use when working on Facebook/LINE messaging, webhooks, UnifiedInbox UI,
  conversation management, agent attribution, or real-time SSE updates.
  Covers ADR-028 (Facebook Messaging) and ADR-033 (Unified Inbox).
---

# Domain: Inbox / Chat (Facebook + LINE)

## Scope

This domain owns **3 Prisma models** (Conversation, Message, ChatEpisode) and handles
dual-channel real-time messaging via webhooks and the Unified Inbox UI.

**Trigger keywords:** inbox, chat, message, conversation, webhook, SSE, reply, LINE, Facebook Messenger, PSID

---

## Architecture Decisions

### ADR-028: Facebook Messaging Integration
- **D1 — Webhook < 200ms (NFR1):** POST endpoint validates HMAC-SHA256, returns 200 immediately, fires `processEvent()` async
- **D2 — Historical Backfill:** `scripts/sync-fb-messages.mjs` polls Meta Graph API with idempotent upsert
- **D3 — Agent Attribution:** `POST /api/marketing/chat/message-sender` matches employees by JSONB `identities.facebook.name`
- **D4 — Message Schema:** Stores `messageId` (Meta mid.$), `fromId` (PSID), `responderId` (FK Employee), `metadata.adReferral`

### ADR-033: Unified Inbox
- Single `Conversation` table with `channel` field (facebook|line) — NO `channel` on Customer model
- Server-side filtering: channel (ALL/facebook/line), status (open/pending/closed), search
- Pagination: 10 conversations/page, infinite scroll
- Real-time via SSE stream `/api/events/stream`

---

## Models (3)

### Conversation
```
id, conversationId (unique, t_XXXXXXXXX)
customerId (FK, nullable), channel (facebook|line)
participantName, participantId, assignedEmployeeId (FK)
status (open|pending|closed), isStarred, unreadCount, lastMessageAt
```
**Relations:** customer, assignedEmployee, messages[], episodes[], orders[]

### Message
```
id, messageId (unique, mid.$... or m_...)
conversationId (FK), responderId (FK Employee, nullable)
fromName, fromId, content
hasAttachment, attachmentType, attachmentUrl
metadata (JSON: adReferral, deliveryStatus)
```
**Relations:** conversation, responder (Employee)

### ChatEpisode
```
id, episodicId (unique), conversationId (FK)
episodicName, summary, state, cta, tags (JSON[])
```

---

## API Routes

### Unified Inbox (`/api/inbox/`) — Primary UI gateway
| Route | Method | Purpose |
|---|---|---|
| `/inbox/conversations` | GET | Paginated list + customer enrichment + last message |
| `/inbox/conversations/[id]/messages` | GET | Paginated messages (chronological) |
| `/inbox/conversations/[id]/messages` | POST | Send reply (creates Message, updates Conversation timestamps) |

**Query params (conversations):** `?channel=ALL&status=open&page=1&limit=10&search=text`

### Legacy Chat (`/api/marketing/chat/`) — Backfill & agent tools
| Route | Method | Purpose |
|---|---|---|
| `/chat/conversations` | GET | All conversations (Facebook-centric) |
| `/chat/conversations/[id]/status` | PUT | Update conversation status |
| `/chat/messages` | GET | Messages by conversation_id |
| `/chat/message-sender` | POST | Agent attribution (responder_id lookup) |
| `/chat/send` | POST | Send message |
| `/chat/assign` | POST | Assign conversation to agent |
| `/chat/star` | PUT | Star/unstar |
| `/chat/read` | POST | Mark as read |

### Webhooks
| Route | Method | Purpose |
|---|---|---|
| `/webhooks/facebook` | GET | Verify token (hub.challenge) |
| `/webhooks/facebook` | POST | HMAC-SHA256 validate → fire-and-forget processEvent() |
| `/webhooks/line` | POST | HMAC-SHA256 validate → recordLineConversion() |

---

## Component: UnifiedInbox.js

**Location:** `src/components/UnifiedInbox.js`

**State:**
```
conversations, selectedId, messages, channel, status, search,
replyText, loading, msgLoading, sending, page, hasMore, msgPage, msgHasMore
```

**Key Handlers:**
- `fetchConversations(pageNum, reset)` — GET /api/inbox/conversations with filters
- `fetchMessages(id, pageNum, reset)` — GET /api/inbox/conversations/{id}/messages
- `handleSend(e)` — POST reply → refresh list
- SSE connection to `/api/events/stream` with exponential backoff retry

**Layout:**
- Left panel (w-80): conversation list + filters + load more
- Right panel: message thread + reply form + customer card

---

## Webhook Processing Flow (NFR1)

```
Meta/LINE POST → Validate HMAC signature
                → Return 200 OK immediately (< 200ms)
                → Async: prisma.$transaction {
                    upsert Customer (by PSID/lineId)
                    upsert Conversation
                    create Message
                  }
                → Emit SSE event for real-time UI
```

---

## Agent Attribution Flow (ADR-028 D3)

```
Scraper reads "ส่งโดย [Name]" from chat UI
  → POST /api/marketing/chat/message-sender
  → Resolve Employee by:
      1. identities.facebook.name (JSONB)
      2. nickName
      3. firstName/lastName
  → Update message.responderId
```

---

## Known Gotcha

- `Customer` model has **NO `channel` field** — always use `Conversation.channel`
- Message reply creates `messageId` format: `m_${crypto.randomUUID()}`
- SSE uses `src/lib/eventBus.js` (Node EventEmitter, max 100 listeners)

---

## Cross-Domain Boundaries

| Touches | How |
|---|---|
| Customer | `Conversation.customerId` FK; webhook upserts Customer by PSID |
| Order | `Order.conversationId` links sale to chat (ADR-030 revenue split) |
| Employee | `Message.responderId` + `Conversation.assignedEmployeeId` |
| Marketing | Chat routes live under `/api/marketing/chat/` (legacy path) |
