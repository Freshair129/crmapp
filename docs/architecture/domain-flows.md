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
    participant BQ   as BullMQ Queue<br/>(Redis 6379)
    participant NW   as notificationWorker.mjs
    participant DB   as PostgreSQL (Supabase)
    participant RD   as Redis Cache<br/>getOrSet TTL
    participant UI   as UnifiedInbox.js<br/>(Employee Browser)

    Note over FB,WH: Real-time webhook (NFR1: < 200ms response)

    FB->>WH: POST message event
    WH-->>FB: 200 OK (immediate — fire & forget)
    WH->>DB: prisma.$transaction<br/>upsert Customer + Conversation + Message<br/>(P2002 race condition handled)
    WH->>NE: evaluateRules(newMessage, context)
    NE->>BQ: enqueue notification job<br/>(keyword/tier/VIP match)
    BQ->>NW: process job
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
    A([New Message Event\nFB Webhook / LINE Webhook]) --> B[notificationEngine.evaluateRules\neventName, context]

    B --> C{Match Rules?}
    C -- No match --> D([End — no notification])

    C -- keyword match --> E[Rule: keyword in body]
    C -- tier match --> F[Rule: membershipTier = VIP]
    C -- VIP match --> G[Rule: customer.isVIP = true]

    E & F & G --> H[Build notification payload\nruleId, channel, template]

    H --> I[BullMQ: add job\nqueue: notifications\nretry ≥ 5x, exp. backoff]

    I --> J[notificationWorker.mjs\npull job from Redis]

    J --> K{notification.channel}
    K -- LINE --> L[lineService.pushMessage\nLINE_CHANNEL_ACCESS_TOKEN]
    K -- email --> M[future — not implemented]

    L --> N{Quota OK?}
    N -- circuit breaker open --> O([skip — log warning])
    N -- OK --> P[LINE API push\n200 OK]
    P --> Q([job done — BullMQ ack])
    N -- fail --> R([throw error → BullMQ retry])
```

---

## 4. Ad Review Pipeline — Phase A Rules + Phase B Gemini AI

```mermaid
flowchart TD
    A([GET /api/marketing/ai-review/adId]) --> B{Result in DB?\nreviewedAt < 24h?}

    B -- fresh --> C([Return cached AdReviewResult])

    B -- stale / missing --> D[adReviewRepo.runPhaseAChecks\nadId]

    D --> E[(DB: Ad + AdCreative\n+ AdDailyMetric 7 days)]

    E --> F[Run 7 Rule Checks]
    F --> F1[CREATIVE_FATIGUE\nCTR day 1-3 vs 4-7 drop > 30%]
    F --> F2[ROAS_NEGATIVE\nROAS < 1.0 AND spend > ฿500]
    F --> F3[ZERO_CONVERSION\nspend > ฿1000 AND purchases = 0]
    F --> F4[HIGH_FREQUENCY\navg daily freq > 3.5]
    F --> F5[EMOJI_OVERLOAD\nemoji count > 7]
    F --> F6[CAPTION_TOO_LONG\nbody.length > 500]
    F --> F7[URGENCY_WORDS\nจำกัด/ด่วน/หมดแล้ว/รีบสมัคร]

    F1 & F2 & F3 & F4 & F5 & F6 & F7 --> G[Calculate Score 0-100\nHIGH: -25 / MEDIUM: -10 / LOW: -5]

    G --> H[saveReviewResult\nadReviewResult.phaseA = checks]

    H --> I{score < 60?}
    I -- No --> J([Return Phase A result])

    I -- Yes --> K[fire-and-forget\nrunPhaseBAnalysis]

    K --> L[geminiReviewService\nanalyzeAdWithGemini]
    L --> M[buildReviewPrompt\nbody + headline + CTA\n+ failed Phase A checks]
    M --> N[Gemini 2.0 Flash API\nresponse_mime_type: application/json]
    N --> O{Parse + Validate JSON}
    O -- invalid / timeout --> P([return null — Phase A still returned])
    O -- valid --> Q[phaseBResult:\ncreativeScore, policyRisk,\naudioenceFit, rewriteSuggestion TH,\nsummary TH]
    Q --> R[update AdReviewResult.phaseB\nlatest record by id]
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
    A([POST /api/schedules/id/complete\n{ studentCount }]) --> B[scheduleRepo\ncompleteSessionWithStockDeduction]

    B --> C[(DB: CourseSchedule\n→ Product → CourseBOM\n→ RecipeIngredient + RecipeEquipment)]

    C --> D{For each ingredient\nin recipe BOM}

    D --> E[qtyNeeded = RecipeIngredient.qty × studentCount]
    E --> F[(DB: IngredientLot\nstatus=ACTIVE\norderBy expiresAt ASC\nFEFO — First Expired First Out)]

    F --> G{remaining > 0?}
    G -- yes --> H[deduct from lot\nremainingQty -= deduct\nupdate lot status\nCONSUMED if remainingQty = 0]
    H --> I[StockDeductionLog\nwrite: lotId, qtyDeducted]
    I --> G

    G -- no more lots --> J[Ingredient.currentStock -= totalDeducted\nDB update]

    D --> K{For each equipment\nin RecipeEquipment}
    K --> L[qtyRequired per session\nNOT multiplied by studentCount]
    L --> M[Ingredient.currentStock -= qtyRequired\nno lot tracking for equipment]

    J & M --> N[prisma.$transaction\nall-or-nothing commit]
    N --> O([CourseSchedule.status = COMPLETED\nreturn deduction summary])
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
        R[(Redis\nioredis docker\nredis:7-alpine :6379)]
    end

    subgraph PostgreSQL
        DB[(Supabase\nPostgreSQL)]
    end

    A -->|key: insights:TIMEFRAME\nTTL: 3600s| R
    B -->|key: inbox:list:PAGE\nTTL: 60s| R
    C -->|key: analytics:team:DATE\nTTL: 3600s| R

    R -->|MISS: query| DB
    DB -->|write-through| R

    style R fill:#dc2626,color:#fff
    style DB fill:#2563eb,color:#fff
```

---

*Last updated: 2026-03-18 — v0.22.0*
*ดูเพิ่มเติม: [overview.md](../overview.md) · [arc42-main.md](./arc42-main.md) · [ADR directory](../adr/)*
