# Domain Data Flow Diagrams — V School CRM v2

Diagram เฉพาะ domain แต่ละส่วน (Mermaid)
อ่านร่วมกับ [`arc42-main.md`](./arc42-main.md) และ [`../overview.md`](../overview.md)

---

## 1. Inbox — Unified FB + LINE Message Flow

```mermaid
sequenceDiagram
    participant FB   as Facebook Messenger
    participant LINE as LINE Platform
    participant WH   as Webhook API<br/>/api/webhooks/facebook<br/>/api/webhooks/line
    participant NE   as notificationEngine.js<br/>evaluateRules()
    participant QS   as Upstash QStash<br/>(HTTP Queue)
    participant NW   as /api/workers/notification<br/>(Vercel serverless)
    participant DB   as PostgreSQL (Supabase)
    participant RD   as Redis Cache<br/>getOrSet TTL
    participant UI   as UnifiedInbox.js<br/>(Employee Browser)

    Note over FB,WH: Real-time webhook (NFR1: < 200ms response)

    FB->>WH: POST message event
    WH-->>FB: 200 OK (immediate — fire & forget)
    WH->>DB: prisma.$transaction<br/>upsert Customer + Conversation + Message<br/>(P2002 race condition handled)
    WH->>NE: evaluateRules(newMessage, context)
    NE->>QS: qstash.publishJSON(url, payload)<br/>(keyword/tier/VIP match)
    QS->>NW: POST /api/workers/notification<br/>+ QStash-Signature header
    NW->>NW: Receiver.verify(signature)
    NW->>LINE: lineService.pushMessage()<br/>quota circuit breaker

    LINE->>WH: POST message event
    WH-->>LINE: 200 OK
    WH->>DB: upsert Conversation + Message (channel=LINE)

    Note over UI,RD: Employee reads inbox
    UI->>RD: GET /api/inbox/conversations<br/>cache key: inbox:list
    alt Cache HIT
        RD-->>UI: JSON (TTL still valid)
    else Cache MISS
        RD->>DB: inboxRepo.getConversations()<br/>join Customer + lastMessage
        DB-->>RD: results
        RD-->>UI: JSON (write-through cache)
    end

    UI->>DB: GET /api/inbox/conversations/[id]/messages<br/>inboxRepo.getConversationMessages() paginated
    UI->>DB: POST /api/inbox/conversations/[id]/messages<br/>inboxRepo.postReply() → FB/LINE send
```

---

## 2. Marketing Sync Pipeline — Meta Ads → DB → Cache

```mermaid
sequenceDiagram
    participant CR  as Cron Job<br/>(x-cron-secret header)
    participant SR  as /api/marketing/sync
    participant FB  as Meta Graph API v19.0<br/>Batch API 50 ads/POST
    participant DB  as PostgreSQL
    participant RD  as Redis Cache

    Note over CR,SR: Hourly trigger (cron secret bypass RBAC)

    CR->>SR: GET /api/marketing/sync
    SR->>FB: POST /v19.0/ batch<br/>fields: spend,impressions,clicks,reach,<br/>actions,action_values,ctr,cpm,frequency

    alt Rate limit (code 4/17/32/613)
        FB-->>SR: 400 rate limit error
        SR-->>CR: HTTP 429 retryAfter:900<br/>fail-fast — do NOT retry in-process
    else Success
        FB-->>SR: batch results (50 ads)
        SR->>DB: prisma.$transaction<br/>bulk upsert AdDailyMetric[]<br/>(chunks of 25, parallel)
        SR->>DB: upsert Ad aggregates<br/>(spend, impressions, clicks, revenue, roas)
        SR->>RD: invalidate cache keys<br/>marketing:*, insights:*
        SR-->>CR: { synced: N, skipped: M }
    end

    Note over SR,DB: Hourly breakdown (separate route)
    CR->>SR: GET /api/marketing/sync-hourly
    SR->>FB: fetch hourly breakdown per ad
    FB-->>SR: AdHourlyMetric data
    SR->>DB: upsert AdHourlyMetric<br/>exponential backoff retry (429)
    SR->>RD: update hourly cache (TTL 3600s)
```

---

## 3. Notification Pipeline — Rule Engine → BullMQ → LINE Push

```mermaid
flowchart TD
    A(["New Message Event<br/>FB Webhook / LINE Webhook"]) --> B["notificationEngine.evaluateRules<br/>eventName, context"]

    B --> C{Match Rules?}
    C -- No match --> D([End — no notification])

    C -- keyword match --> E[Rule: keyword in body]
    C -- tier match --> F[Rule: membershipTier = VIP]
    C -- VIP match --> G[Rule: customer.isVIP = true]

    E & F & G --> H["Build notification payload<br/>ruleId, channel, template"]

    H --> I["QStash: publishJSON<br/>url: /api/workers/notification<br/>retry ≥ 5x built-in"]

    I --> J["/api/workers/notification<br/>Vercel serverless<br/>verify QStash signature"]

    J --> K{notification.channel}
    K -- LINE --> L["lineService.pushMessage<br/>LINE_CHANNEL_ACCESS_TOKEN"]
    K -- email --> M[future — not implemented]

    L --> N{Quota OK?}
    N -- circuit breaker open --> O([skip — log warning])
    N -- OK --> P["LINE API push<br/>200 OK"]
    P --> Q([job done — BullMQ ack])
    N -- fail --> R([throw error → BullMQ retry])
```

---

## 4. Ad Review Pipeline — Phase A Rules + Phase B Gemini AI

```mermaid
flowchart TD
    A(["GET /api/marketing/ai-review/adId"]) --> B{Result in DB?<br/>reviewedAt < 24h?}

    B -- fresh --> C([Return cached AdReviewResult])

    B -- stale / missing --> D["adReviewRepo.runPhaseAChecks<br/>adId"]

    D --> E[("(DB: Ad + AdCreative<br/>+ AdDailyMetric 7 days)")]

    E --> F[Run 7 Rule Checks]
    F --> F1["CREATIVE_FATIGUE<br/>CTR day 1-3 vs 4-7 drop > 30%"]
    F --> F2["ROAS_NEGATIVE<br/>ROAS < 1.0 AND spend > ฿500"]
    F --> F3["ZERO_CONVERSION<br/>spend > ฿1000 AND purchases = 0"]
    F --> F4["HIGH_FREQUENCY<br/>avg daily freq > 3.5"]
    F --> F5["EMOJI_OVERLOAD<br/>emoji count > 7"]
    F --> F6["CAPTION_TOO_LONG<br/>body.length > 500"]
    F --> F7["URGENCY_WORDS<br/>จำกัด/ด่วน/หมดแล้ว/รีบสมัคร"]

    F1 & F2 & F3 & F4 & F5 & F6 & F7 --> G["Calculate Score 0-100<br/>HIGH: -25 / MEDIUM: -10 / LOW: -5"]

    G --> H["saveReviewResult<br/>adReviewResult.phaseA = checks"]

    H --> I{score < 60?}
    I -- No --> J([Return Phase A result])

    I -- Yes --> K["fire-and-forget<br/>runPhaseBAnalysis"]

    K --> L["geminiReviewService<br/>analyzeAdWithGemini"]
    L --> M["buildReviewPrompt<br/>body + headline + CTA<br/>+ failed Phase A checks"]
    M --> N["Gemini 2.0 Flash API<br/>response_mime_type: application/json"]
    N --> O{Parse + Validate JSON}
    O -- invalid / timeout --> P([return null — Phase A still returned])
    O -- valid --> Q["phaseBResult:<br/>creativeScore, policyRisk,<br/>audienceFit, rewriteSuggestion TH,<br/>summary TH"]
    Q --> R["update AdReviewResult.phaseB<br/>latest record by id"]
    R --> S([Employee sees full AI report])
```

---

## 5. Agent Attribution — Playwright Scraper → DB

```mermaid
sequenceDiagram
    participant PW  as sync_agents_v5.js<br/>(Playwright / Chrome CDP)
    participant BS  as Facebook Business Suite<br/>business.facebook.com
    participant CR  as cache.json<br/>(local run cache)
    participant API as /api/marketing/chat/message-sender
    participant AR  as agentSyncRepo.js<br/>processAgentAttribution()
    participant DB  as PostgreSQL


    Note over PW,BS: Mode 1: Sidebar scroll / Mode 2: --mode=db (pull conv IDs from DB)

    PW->>BS: navigate to Business Suite Inbox
    PW->>BS: deep scroll — extract threadIDs<br/>via React fiber props (._4bl9 a[role=row])

    loop each conversation
        PW->>CR: check cache — already synced?
        alt cached
            PW-->PW: skip thread
        else not cached
            PW->>BS: navigate to conversation URL<br/>?selected_item_id=THREAD_ID
            BS-->>PW: DOM rendered
            PW->>PW: extractSenders()<br/>find "ส่งโดย / Sent by" labels<br/>match to sibling message bubbles
            Note over PW: learnedUid: redirect PSID→UID<br/>(15-digit preferred over 17-digit)
            PW->>API: POST message-sender<br/>{ conversationId, senders,<br/>  participantId, newConversationId }
            API->>AR: processAgentAttribution()
            AR->>DB: learnConversationId()<br/>update t_PSID → t_UID if changed<br/>(P2002 handled)
            AR->>DB: resolveEmployeeByName()<br/>FB identity JSONB → nickName fallback
            alt msgId match
                AR->>DB: Message.updateMany<br/>responderId = employee.id
            else msgText fuzzy match
                AR->>DB: Message.updateMany<br/>content startsWith snippet[0:80]
            else conv-level fallback
                AR->>DB: Conversation.update<br/>assignedAgent + assignedEmployeeId
            end
            AR-->>API: { success, updated, convLevelAgent }
            API-->>PW: JSON result
            PW->>CR: saveSyncCache(threadID, result)
        end
    end
```

---

## 6. Kitchen Stock Deduction — Session Complete → FEFO Lot Deduction

```mermaid
flowchart TD
    A(["POST /api/schedules/id/complete<br/>{ studentCount }"]) --> B["scheduleRepo<br/>completeSessionWithStockDeduction"]

    B --> C[("(DB: CourseSchedule<br/>→ Product → CourseBOM<br/>→ RecipeIngredient + RecipeEquipment)")]

    C --> D{"For each ingredient<br/>in recipe BOM"}

    D --> E["qtyNeeded = RecipeIngredient.qty × studentCount"]
    E --> F[("(DB: IngredientLot<br/>status=ACTIVE<br/>orderBy expiresAt ASC<br/>FEFO — First Expired First Out)")]

    F --> G{remaining > 0?}
    G -- yes --> H["deduct from lot<br/>remainingQty -= deduct<br/>update lot status<br/>CONSUMED if remainingQty = 0"]
    H --> I["StockDeductionLog<br/>write: lotId, qtyDeducted"]
    I --> G

    G -- no more lots --> J["Ingredient.currentStock -= totalDeducted<br/>DB update"]

    D --> K{For each equipment<br/>in RecipeEquipment}
    K --> L["qtyRequired per session<br/>NOT multiplied by studentCount"]
    L --> M["Ingredient.currentStock -= qtyRequired<br/>no lot tracking for equipment"]

    J & M --> N["prisma.$transaction<br/>all-or-nothing commit"]
    N --> O(["CourseSchedule.status = COMPLETED<br/>return deduction summary"])
```

---

## Cross-Domain: Redis Cache Strategy

```mermaid
flowchart LR
    subgraph API Routes
        A[/api/marketing/insights]
        B[/api/inbox/conversations]
        C[/api/analytics/team]
    end

    subgraph Redis getOrSet Pattern
        R[("Upstash Redis<br/>REST API<br/>@upstash/redis")]
    end

    subgraph PostgreSQL
        DB[("Supabase<br/>PostgreSQL")]
    end

    A -->|"key: insights:TIMEFRAME<br/>TTL: 3600s"| R
    B -->|"key: inbox:list:PAGE<br/>TTL: 60s"| R
    C -->|"key: analytics:team:DATE<br/>TTL: 3600s"| R

    R -->|MISS: query| DB
    DB -->|write-through| R

    style R fill:#dc2626,color:#fff
    style DB fill:#2563eb,color:#fff
```

---

---

## 7. Chat-First Revenue Attribution — Slip OCR → Transaction → ROAS (Phase 26)

> **หลักการ:** ใช้สลิปโอนเงินในแชทเป็น source of truth ของ Revenue แทนตัวเลข estimated จาก Meta
> **ADR:** ADR-038 (planned)

```mermaid
sequenceDiagram
    participant CUS  as ลูกค้า<br/>(FB / LINE)
    participant WH   as Webhook<br/>facebook / line
    participant DB   as PostgreSQL
    participant GV   as Gemini Vision API<br/>slipParser.js
    participant EMP  as Employee<br/>Slip Review UI
    participant AR   as analyticsRepo<br/>getMonthlyRevenue()

    Note over CUS,WH: ลูกค้าส่งสลิปโอนเงินในแชท

    CUS->>WH: POST image attachment<br/>(attachmentType = image)
    WH-->>CUS: 200 OK (< 200ms — fire & forget)

    WH->>DB: upsert Message<br/>attachmentUrl, attachmentType=image

    Note over WH,GV: ตรวจสอบว่าเป็นสลิปไหม (fire-and-forget)
    WH->>GV: slipParser.parseSlip(imageUrl)
    GV-->>WH: { isSlip: true, amount: 3500,<br/>date: "2026-03-19", refNumber: "6703...",<br/>bankName: "SCB", confidence: 0.97 }

    alt isSlip = true AND confidence > 0.80
        WH->>DB: Transaction.create<br/>slipStatus=PENDING, slipData=OCR result<br/>chatMessageId, conversationId
        Note over WH,EMP: Employee poll /api/payments/pending หรือรับแจ้งเตือน
    else ไม่ใช่สลิป หรือ confidence ต่ำ
        WH-->WH: skip — log warning
    end

    Note over EMP,DB: Employee ตรวจสอบและ verify

    EMP->>DB: GET /api/payments/pending<br/>paymentRepo.getPendingSlips()
    DB-->>EMP: Transaction[] พร้อม slipImageUrl

    EMP->>DB: PATCH /api/payments/[id]/verify<br/>paymentRepo.verifyPayment(id, employeeId)
    DB->>DB: Transaction.slipStatus = VERIFIED<br/>Order.status = PAID (auto-create ถ้าไม่มี)<br/>Order.paidAmount += amount

    Note over DB,AR: Revenue aggregation — bottom-up

    AR->>DB: SUM(Transaction.amount)<br/>WHERE slipStatus=VERIFIED<br/>AND month = target
    DB-->>AR: monthlyRevenue = ฿XX,XXX

    Note over AR: ROAS = monthlyRevenue / Ad.spend<br/>แยก: Ads (firstTouchAdId != null) vs Organic
```

---

## 8. REQ-07: First Touch Ad Attribution — Conversation → Ad Link

> **ปัญหา:** Webhook รับ `referral.ad_id` จาก Facebook ได้ แต่ปัจจุบันทิ้งค่านี้ไป (line 155: `{}`)
> **แก้:** บันทึก `firstTouchAdId` ลง Conversation เมื่อสร้างครั้งแรก

```mermaid
flowchart TD
    A(["ลูกค้าคลิก Ad บน Facebook\n'วิดีโอชาบูเนื้อ A5'"]) --> B["Facebook ส่ง Webhook\nพร้อม referral.ad_id = '120...'"]

    B --> C{"Conversation มีอยู่แล้ว?"}

    C -- ใหม่ (CREATE) --> D["Conversation.create\nfirstTouchAdId = referral.ad_id\nbaked in permanently"]

    C -- มีแล้ว (UPDATE) --> E["ไม่เปลี่ยน firstTouchAdId\n(first touch = immutable)"]

    D --> F[("DB: Conversation\nfirstTouchAdId = '120...'\ncustomerId, channel, ...")]

    F --> G["ลูกค้าส่งสลิป\n→ Transaction.create\n← conversationId"]

    G --> H["Revenue Attribution:\nTransaction → Conversation → Ad\n→ AdSet → Campaign"]

    H --> I(["ROAS = Revenue จากสลิปจริง\n/ Ad.spend จาก Meta API\n= ตัวเลขที่เชื่อถือได้ 100%"])

    style D fill:#d4edda,stroke:#28a745
    style I fill:#cce5ff,stroke:#007bff
```

---

## Cross-Domain: Chat-First Revenue Domain Map

```mermaid
graph TB
    subgraph INBOX ["🔵 INBOX DOMAIN"]
        WH["Webhook\nfacebook / line"]
        WH_IMG["Image Detection\nattachmentType = image"]
        REQ07["REQ-07\nfirstTouchAdId"]
    end

    subgraph INFRA ["⚙️ INFRA DOMAIN"]
        OCR["slipParser.js\nGemini Vision API"]
    end

    subgraph CUSTOMER ["🟡 CUSTOMER DOMAIN"]
        PR["paymentRepo.js"]
        TX["Transaction\nPENDING → VERIFIED"]
        ORD["Order\nauto-create / update"]
    end

    subgraph ANALYTICS ["🔴 ANALYTICS / MARKETING DOMAIN"]
        REV["getMonthlyRevenue()\nSUM verified transactions"]
        ROAS["ROAS Calculation\nreal revenue / ad spend"]
        DASH["Dashboard\nChat Revenue vs Meta Estimate"]
    end

    subgraph EXTERNAL ["☁️ External"]
        GEM["Google Gemini\nVision API"]
        META["Meta Graph API\nAd Spend (cost side only)"]
    end

    WH --> WH_IMG
    WH --> REQ07
    WH_IMG --> OCR
    OCR <--> GEM
    OCR --> PR
    REQ07 --> PR
    PR --> TX
    TX --> ORD
    TX --> REV
    REV --> ROAS
    META -.->|spend data| ROAS
    ROAS --> DASH
```

---

*Last updated: 2026-03-19 — v1.1.0*
*ดูเพิ่มเติม: [overview.md](../overview.md) · [arc42-main.md](./arc42-main.md) · [ADR directory](../adr/)* · [domain-boundaries.md](./domain-boundaries.md)*
