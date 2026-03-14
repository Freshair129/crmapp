---
name: domain-customer
description: >
  Context loader for Customer/Sales domain (6 models, 8+ API routes).
  Use when working on customer management, orders, transactions, payments,
  identity resolution, revenue analytics, membership tiers, inventory, or timeline.
  Covers ADR-025 (Identity Resolution) and ADR-030 (Revenue Channel Split).
---

# Domain: Customer / Sales

## Scope

This domain owns **6 Prisma models** (Customer, Order, Transaction, InventoryItem,
TimelineEvent, CartItem) and handles identity resolution, sales pipeline, and revenue analytics.

**Trigger keywords:** customer, order, transaction, payment, slip, identity, PSID, revenue, tier, membership, inventory, wallet, timeline

---

## Architecture Decisions

### ADR-025: Cross-Platform Identity Resolution
- **D1 — Phone E.164:** All phones normalized before storage (e.g. `081-234-5678` → `+66812345678`). Stored in `Customer.phonePrimary`
- **D2 — Identity Merge via Phone:** Webhook → normalize phone → query by `phonePrimary` → upsert PSID/lineId to existing Customer. All ops in `prisma.$transaction` (NFR5)
- **D3 — Global User ID:** `Customer.id` (UUID) is the merge point for PSID, LINE ID, phone
- **D4 — LINE Attribution:** LINE webhook → lookup by `lineId` → use `Customer.originId` (ad_id) → attribute to Meta campaign → fix ROAS under-report
- **D5 — Scraper Heuristic:** `[Name]` matching → map to agent via `id-mapping.yaml` → persist PSID on success

### ADR-030: Revenue Channel Split
- **D1:** `Order.conversationId IS NULL` = Store Revenue (walk-in); `NOT NULL` = Ads Revenue (from chat)
- **D2:** API returns: `totalRevenue`, `revenueAds`, `revenueStore`, `%change` for each
- **D3:** Timeframe keys: `today`, `this_week`, `this_month`, `last_month`, `last_90d`, `ytd`, `all_time`
- **D4:** UI shows 4 stat cards: Total (Gold), Ads (Blue), Store (Emerald), Orders (Indigo)

---

## Models (6)

### Customer
```
id (UUID), customerId (unique, TVS-CUS-[CH]-[YY]-[XXXX])
memberId, originId (source ad_id for ROAS)
firstName, lastName, nickName, status (Active|Inactive)
membershipTier (MEMBER|L1|L2|L3|L4|L5)
lifecycleStage (Lead|Engaged|Converted|VIP|Churn)
email, phonePrimary (E.164), lineId, facebookId (unique), facebookName
walletBalance, walletPoints, walletCurrency (THB)
intelligence (JSON: source_ad_id, courses_owned, metrics)
```
**Relations:** orders[], conversations[], inventory[], tasks[], timeline[], cart[]
**Indexes:** status, phonePrimary, firstName+lastName

### Order
```
id (UUID), orderId (unique)
customerId (FK), closedById (FK Employee)
conversationId (FK Conversation, nullable) ← ADR-030 key field
status (PENDING|CLOSED|REFUNDED), date
totalAmount, paidAmount, items (JSON array)
```
**Relations:** customer, closedBy (Employee), conversation, transactions[]

### Transaction
```
id (UUID), transactionId (unique)
orderId (FK), amount, type (PAYMENT|REFUND|CREDIT)
method (Transfer|Cash|QR), chatMessageId
slipImageUrl, slipStatus (PENDING|VERIFIED|FAILED), slipData (JSON)
```

### InventoryItem
```
id (UUID), customerId (FK)
type (COURSE|MENU|PACKAGE), itemId, name
status (ACTIVE|EXPIRED|USED), enrollDate, expiryDate, metadata (JSON)
```

### TimelineEvent
```
id (UUID), eventId, customerId (FK)
type (PURCHASE|CHAT|FOLLOW_UP|NOTE), summary, details (JSON), date
```

### CartItem
```
id (UUID), customerId (FK), productId (FK), quantity
Unique constraint: (customerId, productId)
```

---

## Repository: `src/lib/repositories/customerRepo.js`

| Function | Purpose |
|---|---|
| `getAllCustomers(opts)` | Find many with search, limit, offset |
| `getCustomerById(id)` | Find unique with orders, conversations |
| `upsertCustomerByPsid(psid, data)` | Upsert via facebookId |
| `upsertCustomerByPhone(phone, data)` | Upsert via phonePrimary |

## Repository: `src/lib/repositories/analyticsRepository.js`

| Function | Purpose |
|---|---|
| `getRevenueHistory(days=30)` | Aggregates orders by date, splits adsRevenue vs storeRevenue via conversationId |

---

## API Routes

### Customers (`/api/customers/`)
| Route | Method | Purpose |
|---|---|---|
| `/customers` | GET | List with search, ?index=true for lightweight |
| `/customers` | POST | Create customer |
| `/customers/[id]` | GET | Detail with orders, conversations |
| `/customers/[id]` | PATCH | Update fields |
| `/customers/[id]` | DELETE | Soft delete |
| `/customers/sync` | POST | Sync from external source |

### Orders (`/api/orders/`)
| Route | Method | Purpose |
|---|---|---|
| `/orders` | GET | List with filters |
| `/orders` | POST | Create order |
| `/orders/[id]` | GET | Detail with transactions |

### Members
| Route | Method | Purpose |
|---|---|---|
| `/members/register` | POST | Register new member (public) |

---

## Components

### CustomerCard.js
- Right-side detail panel for selected customer
- Props: `customer`, `customers`, `onSelectCustomer`, `currentUser`, `onUpdateInventory`, `onGoToChat`
- Shows: tier config (L1-L5), wallet, intelligence, inventory, timeline
- Child components: `IntelligencePanel`, `InventoryPanel`, `Timeline`

### CustomerList.js
- Main customer list with filtering, search, sort
- Normalizer function handles both flat (DB) and nested (legacy) data shapes
- Pagination: 25 items/page default
- Filters: tier, search, sort by revenue/name/date

---

## Customer ID Format

```
TVS-CUS-[CH]-[YY]-[XXXX]
  CH = channel: FB (Facebook), LN (LINE), WK (Walk-in), WB (Web)
  YY = year (26)
  XXXX = sequential number
Example: TVS-CUS-FB-26-0123
```

---

## Membership Tiers

| Tier | Level | Criteria |
|---|---|---|
| MEMBER | Base | Default on creation |
| L1 | Bronze | Spending threshold + hours |
| L2 | Silver | Higher thresholds |
| L3 | Gold | Higher thresholds |
| L4 | Platinum | Higher thresholds |
| L5 | Diamond | Highest tier |

---

## Cross-Domain Boundaries

| Touches | How |
|---|---|
| Conversation | `Customer.conversationId` FK; identity merge links Customer to chat |
| Marketing | `Customer.originId` = source ad_id for ROAS attribution |
| Order → Conversation | `Order.conversationId` determines Ads vs Store revenue |
| Employee | `Order.closedById` tracks who closed the sale |
| Product | `CartItem.productId` FK; `InventoryItem` tracks purchased products |
