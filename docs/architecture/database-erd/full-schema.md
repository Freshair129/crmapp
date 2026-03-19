# Database Schema — Full Reference

**Last Updated:** 2026-03-19
**Reference:** `prisma/schema.prisma`

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
        Json     slipData            "Slip OCR result"
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
```

### DOMAIN: Operations & Enrollment

```mermaid
erDiagram
    Enrollment {
        String   id            PK
        String   enrollmentId  UK
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
        String   classId           "Batch ID for inventory"
    }

    Ingredient {
        String   id PK
        String   ingredientId UK
        String   name
        Float    currentStock
        Float    minStock
    }

    IngredientLot {
        String   id PK
        String   lotId UK "LOT-YYYYMMDD-XXX"
        String   ingredientId FK
        Float    initialQty
        Float    remainingQty
        DateTime expiresAt
        String   status "ACTIVE | CONSUMED | EXPIRED"
    }
```

---

## 2. Shared Modules (Context Diagrams)

### Module 1: Sales & Marketing Core
Focus on the relationship between Customers, Ads, and Transactions.

### Module 2: Operations & Kitchen
Focus on the relationship between Products, Recipes, Stock (Lots), and PRs.

### Module 3: Enrollment & Packages
Focus on the hierarchy of Packages and Course Enrollments.

---

## 3. Key Data Flows

### Stock Deduction Flow (FEFO)
1. `CourseSchedule` COMPLETED
2. Fetch `RecipeIngredient` (MenuBOM)
3. Deduct from `IngredientLot` (Order by `expiresAt ASC`)
4. Log to `StockDeductionLog`
5. Update `Ingredient.currentStock`

### Attribution Flow
1. Facebook Ad Click
2. Webhook -> `Conversation.firstTouchAdId`
3. Sales -> `Order.conversationId`
4. Payment -> `Transaction` (Revenue)
5. Aggregate -> `Ad.revenue`

---

## 4. Architecture Decisions (ADR Mapping)

| ADR | Decision | Impact |
|---|---|---|
| 024 | Bottom-Up Aggregation | Campaign calculations derived from Ad level |
| 025 | Identity Resolution | `Customer.originId` for tracking |
| 030 | Revenue Split | `Order.conversationId` defines revenue channel |
| 039 | Chat-First Revenue | `Transaction.slipStatus` as truth |
| 040 | Upstash Infra | Redis/QStash move |

---
