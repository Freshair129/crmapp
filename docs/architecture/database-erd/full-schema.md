# Database Schema — Full Reference

**Last Updated:** 2026-03-21 — v1.3.0
**Reference:** `prisma/schema.prisma`
**Model Count:** 47 models

---

## 1. Entity Blocks (Detailed Fields)

### DOMAIN: Customer

```mermaid
erDiagram
    Customer {
        String   id             PK  "UUID"
        String   customerId     UK  "TVS-CUS-[CH]-[YY]-[XXXX]"
        String   memberId           "MEM-[YY][AGENT][INTENT]-[SERIAL]"
        String   originId           "ad_id จาก FB webhook referral"
        String   status             "Active | Inactive | Blocked"
        String   membershipTier     "MEMBER | SILVER | GOLD | PLATINUM | VIP | DIAMOND"
        String   lifecycleStage     "Lead | Prospect | Active | Churned"
        String   email
        String   phonePrimary       "E.164 format (+66...)"
        String   phoneSecondary
        String   lineId
        String   facebookId     UK  "PSID"
        String   facebookName
        Float    walletBalance
        Int      walletPoints
        Json     intelligence       "Gemini AI analysis result"
        String   conversationId     "last active conversation"
        DateTime createdAt
        DateTime updatedAt
    }

    Order {
        String   id             PK  "UUID"
        String   orderId        UK
        String   customerId     FK
        String   closedById     FK  "Employee"
        String   conversationId FK  "null=Store Revenue · not null=Ads Revenue"
        String   status             "PENDING | CONFIRMED | COMPLETED | CANCELLED"
        Float    totalAmount
        Float    paidAmount
        Json     items              "[{productId,name,price,qty}]"
        DateTime date
    }

    Transaction {
        String   id              PK  "UUID"
        String   transactionId   UK  "PAY-YYYYMMDD-SERIAL"
        String   orderId         FK
        Float    amount
        String   type                "PAYMENT | REFUND | CREDIT"
        String   method              "Transfer | Cash | QR"
        String   slipStatus          "PENDING | VERIFIED | FAILED"
        Json     slipData            "Slip OCR result (Gemini Vision)"
        String   refNumber           "unique — prevents duplicate slip"
        DateTime date
    }
```

### DOMAIN: Marketing / Ads

```mermaid
erDiagram
    Ad {
        String   id             PK  "UUID"
        String   adId           UK  "Meta ad_id"
        String   adSetId        FK
        String   creativeId     FK
        String   experimentId   FK
        String   name
        String   status             "ACTIVE | PAUSED | DELETED"
        Float    spend
        Int      impressions
        Int      clicks
        Float    revenue
        Float    roas
        DateTime createdAt
    }

    AdDailyMetric {
        String   id          PK
        String   adId        FK
        DateTime date
        Float    spend
        Int      impressions
        Int      clicks
        Int      leads
        Int      purchases
        Float    revenue
        Float    roas
    }

    AdHourlyLedger {
        String   id    PK
        String   adId  FK
        DateTime date
        Int      hour
        Float    spend
        Float    revenue
        Float    roas
    }

    Conversation {
        String   id              PK
        String   conversationId  UK  "t_{15_digit_uid}"
        String   customerId      FK
        String   channel             "facebook | line"
        String   firstTouchAdId      "REQ-07 — immutable ad attribution"
        DateTime createdAt
    }
```

### DOMAIN: Operations & Enrollment

```mermaid
erDiagram
    Enrollment {
        String   id            PK
        String   enrollmentId  UK  "ENR-YYYY-SERIAL"
        String   customerId    FK
        String   productId     FK
        String   soldById      FK
        Float    totalPrice
        String   status
        DateTime enrolledAt
    }

    CourseSchedule {
        String   id                PK
        String   scheduleId        UK
        String   productId         FK
        String   instructorId      FK
        DateTime scheduledDate
        String   startTime
        String   endTime
        Int      maxStudents
        Int      confirmedStudents
        String   status
        String   classId           "CLS-YYYYMM-XXX — batch cohort grouping"
        String   sessionType       "MORNING | AFTERNOON | EVENING"
    }

    Ingredient {
        String   id          PK
        String   ingredientId UK
        String   name
        Float    currentStock
        Float    minStock
    }

    IngredientLot {
        String   id          PK
        String   lotId       UK  "LOT-YYYYMMDD-XXX"
        String   ingredientId FK
        Float    initialQty
        Float    remainingQty
        DateTime expiresAt
        String   status          "ACTIVE | CONSUMED | EXPIRED | RECALLED"
    }
```

### DOMAIN: Product (Unified Catalog)

```mermaid
erDiagram
    Product {
        String   id              PK  "UUID"
        String   productId       UK  "TVS-[CATEGORY]-[PACK]-[SUBCAT]-[SERIAL]"
        String   name
        String   category            "course | food | side_dish | equipment | package"
        String   fallbackSubCategory "sub-filter: knife | kitchen | fish_tool | sushi | sharpening"
        Float    basePrice
        Float    hours               "ชั่วโมงเรียน (course only)"
        String   sessionType         "MORNING | AFTERNOON | EVENING"
        String   brand               "ยี่ห้อ (equipment)"
        String   size                "ขนาด (equipment)"
        String   dimension           "ไดเมนชั่น (equipment)"
        Float    unitAmount          "ปริมาณ (ml/g/piece)"
        String   unitType            "ml | g | piece"
        String   originCountry       "ประเทศผู้ผลิต — ORIGIN_COUNTRIES list"
        String   hand                "LEFT | RIGHT | BOTH"
        String   material            "วัสดุ เช่น เหล็ก ไม้ ทองแดง"
        Float    boxDimW             "กว้างกล่อง (cm)"
        Float    boxDimL             "ยาวกล่อง (cm)"
        Float    boxDimH             "สูงกล่อง (cm)"
        Float    boxWeightG          "น้ำหนักกล่อง (g)"
        Float    shippingWeightG     "น้ำหนักรวมสำหรับจัดส่ง (g)"
    }
```

### DOMAIN: Web Push Notifications (ADR-044)

```mermaid
erDiagram
    PushSubscription {
        String   id          PK  "UUID"
        String   employeeId  FK  "→ Employee"
        String   endpoint    UK  "browser push endpoint URL"
        String   p256dh          "ECDH public key"
        String   auth            "auth secret"
        String   userAgent       "browser UA (optional)"
        DateTime createdAt
        DateTime updatedAt
    }

    Employee ||--o{ PushSubscription : "subscribes"
```

---

## 2. Shared Modules (Context Diagrams)

### Module 1: Sales & Marketing Core
Focus on the relationship between Customers, Ads, Conversations (firstTouchAdId), and Transactions.

### Module 2: Operations & Kitchen
Focus on the relationship between Products, Recipes, Stock Lots (FEFO), and Purchase Requests.

### Module 3: Enrollment & Packages
Focus on the hierarchy of Packages → PackageCourse → Enrollment → EnrollmentItem.

---

## 3. Key Data Flows

### Stock Deduction Flow (FEFO)
1. `CourseSchedule` COMPLETED
2. Fetch `RecipeIngredient` via `CourseBOM` (MenuBOM)
3. Deduct from `IngredientLot` (Order by `expiresAt ASC` — FEFO)
4. Log to `StockDeductionLog`
5. Update `Ingredient.currentStock`

### Chat-First Revenue Attribution Flow (Phase 26)
1. Facebook Ad Click → `Conversation.firstTouchAdId` (REQ-07, immutable)
2. ลูกค้าส่งสลิปในแชท → Gemini Vision OCR → `Transaction` (PENDING)
3. พนักงาน verify → `Transaction.slipStatus = VERIFIED`
4. `Order.paidAmount` อัปเดต
5. `analyticsRepo` aggregate: `SUM(Transaction.amount WHERE slipStatus=VERIFIED)`
6. ROAS = verified revenue / Ad.spend (ไม่ใช่ Meta estimated)

### Web Push Real-time Flow (ADR-044)
1. FB/LINE Webhook ได้รับข้อความใหม่
2. `notifyInbox()` fire-and-forget → `web-push` → Google/Mozilla Push Server
3. Service Worker (`/public/sw.js`) ได้รับ push event
4. แสดง OS notification → user click → `PUSH_NAVIGATE` postMessage
5. `UnifiedInbox.js` refetch conversations

---

## 4. Architecture Decisions (ADR Mapping)

| ADR | Decision | Model Impact |
|---|---|---|
| 024 | Bottom-Up Aggregation | `AdDailyMetric` → `Ad.roas` derivation |
| 025 | Identity Resolution | `Customer.originId`, phone E.164 |
| 028 | FB Webhook < 200ms | `Conversation` + `Message` upsert in `$transaction` |
| 030 | Revenue Channel Split | `Order.conversationId` null=Store / not null=Ads |
| 037 | Product-as-Course-Catalog | `Product.hours`, `Product.sessionType` |
| 039 | Chat-First Revenue | `Transaction.slipStatus` as truth — not Meta estimate |
| 040 | Upstash Infra | Redis/QStash — no local Docker |
| 043 | Equipment Domain POS | `Product.hand/material/boxDim*/shippingWeightG` |
| 044 | Web Push Inbox | `PushSubscription` model — ลบ SSE+polling |

---
