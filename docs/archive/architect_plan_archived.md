# Architect Plan — V School CRM-App
> Lead Architect: Claude | Sub-Agent: Gemini CLI (`gemini -p "..." -o text`)
> Updated: 2026-03-08

---

## Sub-Agent Protocol

### การเรียกใช้ Gemini เป็น Sub-agent

```bash
# Pattern 1: Prompt ตรง (headless, non-interactive)
gemini -p "เขียน function signature..." -o text

# Pattern 2: ส่ง Interface ผ่าน stdin (ประหยัด token)
echo "Interface:\n\`\`\`ts\n...\n\`\`\`\nTask: implement this" | gemini -p "implement only, no explanation" -o text

# Pattern 3: อ่านไฟล์ + task (สำหรับ function ที่ต้องอ้างอิง context เล็กน้อย)
cat src/lib/db.js | head -50 | gemini -p "เพิ่ม function getCustomerById ให้สอดคล้องกับ pattern นี้" -o text
```

### กฎการ Delegate
- ส่งเฉพาะ **Function Signature / Interface** ไม่ส่งโค้ดทั้งไฟล์
- งานที่ Delegate ได้: boilerplate, unit test, helper function, error handler wrapper
- งานที่ Architect ทำเอง: architectural decision, integration logic, security review

---

## Current State Analysis

### Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14.2.5 (App Router), React 18, TailwindCSS |
| API | Next.js API Routes |
| ORM | Prisma 7.4 + pg adapter |
| Database | PostgreSQL (Supabase) + JSON fallback |
| Queue | Redis + BullMQ |
| AI | Google Gemini (`gemini-pro`) |
| Automation | Playwright (agent scraping) |
| Cron | node-cron (instrumentation.js) |

### Key Entry Points
| File | Role |
|---|---|
| `src/app/page.js` | SPA root — `activeView` state controls all views |
| `src/lib/db.js` | **God file** — Strategy pattern สำหรับ JSON/Prisma |
| `src/workers/eventProcessor.mjs` | BullMQ worker สำหรับ Facebook events |
| `src/instrumentation.js` | Cron scheduler (Next.js startup hook) |
| `src/utils/BusinessAnalyst.js` | Gemini AI wrapper — analysis, reply, detection |

---

## Technical Debt Register

| # | ปัญหา | Severity | ไฟล์หลัก |
|---|---|---|---|
| TD-01 | `db.js` รับผิดชอบหลายอย่าง (SRP Violation) | HIGH | `src/lib/db.js` |
| TD-02 | `if (DB_ADAPTER === ...)` ซ้ำหลายร้อยบรรทัด (DRY) | HIGH | `src/lib/db.js` |
| TD-03 | `fs.readFileSync/writeFileSync` ใน async context | MEDIUM | `src/lib/cacheSync.js` |
| TD-04 | `catch(e) {}` เงียบ ซ่อน errors | MEDIUM | ทั่วไป |
| TD-05 | snake_case/camelCase ปนกันใน JS layer | LOW | ทั่วไป |
| TD-06 | `scripts/` มี 39+ ไฟล์ไม่มี organization | LOW | `scripts/` |

---

## Improvement Roadmap

---

### Phase 1: Foundation — แก้ Core Architecture (สัปดาห์ 1-2)

#### Task 1.1 — แยก db.js ออกเป็น Modules
**Architect ทำ:** วางโครงสร้างและ Interface

```
src/lib/
  db/
    index.js          ← facade (re-export ทุกอย่าง)
    adapters/
      jsonAdapter.js  ← JSON file operations
      prismaAdapter.js← Prisma operations
    repositories/
      customerRepo.js ← Customer CRUD
      orderRepo.js    ← Order CRUD
      employeeRepo.js ← Employee CRUD
      marketingRepo.js← Ad/Campaign data
    cache/
      cacheSync.js    ← ย้ายจาก lib/cacheSync.js
```

**Sub-agent (Gemini) ทำ:**
```bash
echo "
Interface ที่ต้องการ implement:

// customerRepo.js
export async function getAllCustomers(opts?: { includeRelations?: boolean }): Promise<Customer[]>
export async function getCustomerById(id: string): Promise<Customer | null>
export async function upsertCustomer(data: CustomerInput): Promise<Customer>
export async function searchCustomers(query: string): Promise<Customer[]>

Pattern ปัจจุบันใน db.js ใช้ Prisma client แบบ lazy-load ผ่าน getPrisma()
ต้องรองรับ DB_ADAPTER=json fallback ด้วย
" | gemini -p "implement customerRepo.js ตาม interface นี้ Node.js ESM, JSDoc" -o text
```

#### Task 1.2 — แก้ Sync I/O ใน cacheSync.js
**Sub-agent ทำ:** แปลง readFileSync → fs.promises ทั้งไฟล์
```bash
cat src/lib/cacheSync.js | gemini -p "แปลง readFileSync/writeFileSync ทั้งหมดเป็น async/await fs.promises คงค่า exports เดิม" -o text
```

#### Task 1.3 — Error Handling Wrapper
**Sub-agent ทำ:** สร้าง utility function
```bash
echo "
Interface:
export function withErrorLog<T>(fn: () => Promise<T>, context: string): Promise<T | null>
// wrap async function, log error ใน format '[context] error.message', return null on failure
// ห้าม silent catch
" | gemini -p "implement และ export ใน src/lib/errorUtils.js" -o text
```

---

### Phase 2: Feature — LINE Attribution Gap (สัปดาห์ 3)

**Business Impact:** ROAS under-report จริง (5.29x vs รายงาน 1.54x) เพราะลูกค้าปิดการขายผ่าน LINE ไม่ถูกผูกกลับ Facebook

#### Task 2.1 — LINE Conversion Attribution
**Architect ทำ:** กำหนด data flow
```
LINE Webhook → lineService.js → matchCustomerByPhone() → Customer.origin_id (ad_id) →
  → บันทึก conversion event → ผูกกับ Campaign/Ad ใน DB
```

**Sub-agent ทำ:** เพิ่ม function ใน lineService.js
```bash
echo "
Signature:
async function recordLineConversion(payload: {
  lineUserId: string,
  phone: string,       // E.164 format
  orderAmount: number,
  productId: string
}): Promise<{ customerId: string, adId: string | null, attributed: boolean }>

Context: Customer table มี columns: phone_primary, origin_id (ad_id), facebook_id
ใช้ phone_primary เป็น lookup key, return origin_id เพื่อทำ attribution
" | gemini -p "implement ใน Node.js, ใช้ Prisma pattern เหมือน getAllCustomers()" -o text
```

#### Task 2.2 — API Endpoint สำหรับ LINE Webhook
**Sub-agent ทำ:** boilerplate route handler
```bash
echo "
Route: POST /api/webhooks/line
Validates: LINE signature header (X-Line-Signature)
Calls: lineService.recordLineConversion()
Response: 200 OK ภายใน 200ms (LINE requirement)
Pattern: เหมือน /api/webhooks/facebook (BullMQ enqueue)
" | gemini -p "เขียน Next.js App Router route handler" -o text
```

---

### Phase 3: Intelligence — Creative Fatigue Alerts (สัปดาห์ 4)

#### Task 3.1 — Creative Age Monitor
**Architect ทำ:** Logic specification
```
Ad.created_date → ถ้า (today - created_date) > 30 days AND spend > threshold → alert
```

**Sub-agent ทำ:**
```bash
echo "
Interface:
async function detectCreativeFatigue(thresholdDays: number = 30, minSpend: number = 1000): Promise<{
  adId: string,
  adName: string,
  ageDays: number,
  totalSpend: number,
  roas: number
}[]>

// Query จาก Ad table, include Campaign name
// ใช้ Prisma, ไม่ต้องทำ LINE notification (แค่ return data)
" | gemini -p "implement ใน src/services/fatigueDetector.js" -o text
```

#### Task 3.2 — เชื่อมต่อกับ LINE Daily Report
**Architect integrate:** เพิ่มใน `instrumentation.js` cron job ที่มีอยู่แล้ว

---

### Phase 4: Observability — Structured Logging (สัปดาห์ 5)

#### Task 4.1 — Replace console.log/error ด้วย Structured Logger
**Sub-agent ทำ:**
```bash
echo "
Interface:
export const logger = {
  info(module: string, message: string, meta?: object): void
  warn(module: string, message: string, meta?: object): void
  error(module: string, message: string, error?: Error, meta?: object): void
}
// Output format: JSON lines { timestamp, level, module, message, ...meta }
// ใน dev: pretty print, ใน production: JSON
// ไม่ต้องใช้ external library
" | gemini -p "implement ใน src/lib/logger.js" -o text
```

---

---

### Phase 5: Marketing Intelligence Pipeline — ADR-024 (สัปดาห์ 5-6)

**ที่มา:** FR4.5–FR4.9, system_requirements.yaml

#### Task 5.1 — Bottom-Up Aggregation Engine
**Architect ทำ:** กำหนด aggregation flow
```
Ad (raw) → AdSet (sum) → Campaign (sum) ทุกครั้งหลัง sync
```
**Sub-agent ทำ:**
```bash
echo "
Interface:
async function aggregateHierarchy(syncDate: Date): Promise<{
  adsets: { id: string, spend: number, impressions: number, clicks: number, results: number }[],
  campaigns: { id: string, spend: number, impressions: number, clicks: number, results: number }[]
}>
// Query Ads จาก DB → group by adsetId → sum → group by campaignId → sum
// ใช้ Prisma groupBy
" | gemini -p "implement ใน src/services/marketingAggregator.js Node.js ESM" -o text
```

#### Task 5.2 — Checksum Verifier
**Sub-agent ทำ:**
```bash
echo "
Interface:
async function verifyChecksum(campaignId: string, tolerance: number = 0.01): Promise<{
  passed: boolean,
  campaignId: string,
  metaTotal: number,
  calculatedTotal: number,
  delta: number
}>
// Compare Meta API campaign total vs Sum(Ads) from DB
// Log error if Math.abs(delta/metaTotal) > tolerance
" | gemini -p "implement ใน src/services/checksumVerifier.js" -o text
```

#### Task 5.3 — Hourly Ledger (append-only)
**Architect ทำ:** เพิ่ม Prisma model
```prisma
model AdHourlyLedger {
  id         String   @id @default(cuid())
  adId       String   @map("ad_id")
  hour       DateTime // truncated to hour
  deltaSpend Float    @map("delta_spend")
  deltaResults Int    @map("delta_results")
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("ad_hourly_ledger")
}
```
**Sub-agent ทำ:** write function
```bash
echo "
Interface:
async function appendLedgerIfChanged(adId: string, hour: Date, current: { spend: number, results: number }): Promise<boolean>
// Compare with last ledger entry, if delta != 0 → insert new row, return true
// If delta == 0 → skip, return false
" | gemini -p "implement ใน src/services/hourlyLedger.js Prisma ESM" -o text
```

#### Task 5.4 — Derived Metrics API
**Sub-agent ทำ:** helper functions
```bash
echo "
Interface (compute only, no DB write):
function calcCON(transactions: number, costPerResult: number): number   // transactions / CPR
function calcCPA(spend: number, transactions: number): number            // spend / transactions
function calcROAS(revenue: number, spend: number): number                // revenue / spend

Export as named exports from src/utils/marketingMetrics.js
" | gemini -p "implement with JSDoc, handle division by zero" -o text
```

---

### Phase 6: Identity Resolution — ADR-025 (สัปดาห์ 7)

**ที่มา:** FR3.1–FR3.2, id_standards.yaml

#### Task 6.1 — Phone Normalization Utility
**Sub-agent ทำ:**
```bash
echo "
Interface:
function normalizePhone(raw: string, defaultCountry: string = 'TH'): string | null
// Supports: '081xxxxxxx', '6681xxxxxxx', '+6681xxxxxxx', '02-xxx-xxxx'
// Returns E.164 format: '+66812345678'
// Returns null if cannot normalize
// No external libraries — pure regex/string manipulation
" | gemini -p "implement ใน src/utils/phoneUtils.js, export named" -o text
```

#### Task 6.2 — Identity Merge Logic
**Architect ทำ:** กำหนด transaction boundary
```js
// เรียกในทุก webhook handler ก่อน upsertCustomer()
async function resolveOrCreateCustomer(payload: {
  psid?: string, lineId?: string, phone?: string,
  channel: 'FB' | 'LINE' | 'WB' | 'WL'
}): Promise<Customer>
```
**Sub-agent ทำ:** implement ใน `src/lib/identityService.js`
```bash
echo "
Interface:
async function resolveOrCreateCustomer(payload: {
  psid?: string,
  lineId?: string,
  phone?: string,
  channel: 'FB' | 'LINE' | 'WB' | 'WL',
  name?: string
}): Promise<{ customer: Customer, isNew: boolean, merged: boolean }>

Logic:
1. normalizePhone(phone)
2. findFirst WHERE facebookId=psid OR lineId=lineId OR phonePrimary=normalized
3. ถ้าพบ → upsert missing fields, return existing
4. ถ้าไม่พบ → create new Customer (customerId format: TVS-CUS-[CH]-[YY]-[SERIAL])
5. ทุก operation ใน prisma.$transaction
" | gemini -p "implement Node.js ESM Prisma" -o text
```

#### Task 6.3 — LINE Conversion Attribution
**Sub-agent ทำ:** เพิ่มใน `src/lib/lineService.js`
```bash
echo "
Interface:
async function recordLineConversion(payload: {
  lineUserId: string,
  phone: string,
  orderAmount: number,
  productId?: string
}): Promise<{ customerId: string, adId: string | null, attributed: boolean }>

Logic:
1. resolveOrCreateCustomer({ lineId, phone, channel: 'LINE' })
2. Read customer.origin_id (= ad_id from first FB interaction)
3. If origin_id exists → create attribution record
4. Return { customerId, adId: origin_id, attributed: !!origin_id }
" | gemini -p "implement Node.js ESM" -o text
```

---

### Phase 7: RBAC — ADR-026 (สัปดาห์ 8)

**ที่มา:** FR1.3, system_requirements.yaml

#### Task 7.1 — Role Permission Helper
**Sub-agent ทำ:**
```bash
echo "
Roles (ordered by permission level):
DEVELOPER > MANAGER > SUPERVISOR > ADMIN > AGENT > GUEST

Interface:
const ROLE_HIERARCHY: Record<string, number>
function hasPermission(userRole: string, requiredRole: string): boolean
// hasPermission('MANAGER', 'ADMIN') → true
// hasPermission('AGENT', 'MANAGER') → false

Export from src/lib/rbac.js
" | gemini -p "implement with JSDoc, export named" -o text
```

#### Task 7.2 — API Route Guard Middleware
**Sub-agent ทำ:**
```bash
echo "
Interface:
export function requireRole(minRole: string): (req: NextRequest) => Promise<NextResponse | null>
// null = allowed, NextResponse({ error: 'Forbidden' }, 403) = blocked
// reads session from getServerSession(authOptions)
// uses hasPermission() from rbac.js

Export from src/lib/authGuard.js
" | gemini -p "implement Next.js App Router pattern" -o text
```

#### Task 7.3 — Retrofit Sensitive Routes
**Architect ทำ:** wrap routes ที่ sensitive
```
/api/employees/*     → requireRole('MANAGER')
/api/marketing/*     → requireRole('SUPERVISOR')
/api/analytics/*     → requireRole('SUPERVISOR')
/api/customers/*     → requireRole('AGENT')
/api/webhooks/*      → internal only (signature check แทน role)
```

---

## Execution Checklist

### Phase 1 (ทำก่อน)
- [ ] 1.1 วางโครงสร้าง `src/lib/db/` directories
- [ ] 1.1 Delegate: `customerRepo.js` → Gemini
- [ ] 1.1 Delegate: `orderRepo.js` → Gemini
- [ ] 1.1 Delegate: `employeeRepo.js` → Gemini
- [ ] 1.1 QA: ตรวจสอบและ integrate repos เข้า index.js
- [ ] 1.2 Delegate: แปลง cacheSync.js → Gemini
- [ ] 1.2 QA: test ว่า cache อ่าน/เขียนได้
- [ ] 1.3 Delegate: errorUtils.js → Gemini
- [ ] 1.3 Apply: replace silent catches ทั่วโปรเจกต์

### Phase 2
- [ ] 2.1 Delegate: recordLineConversion() → Gemini
- [ ] 2.2 Delegate: LINE webhook route → Gemini
- [ ] 2.x QA + integration test

### Phase 3
- [ ] 3.1 Delegate: detectCreativeFatigue() → Gemini
- [ ] 3.2 Architect: integrate กับ instrumentation.js

### Phase 4
- [ ] 4.1 Delegate: logger.js → Gemini
- [ ] 4.x Replace console.log ทั่วโปรเจกต์

### Phase 5 — Marketing Intelligence (ADR-024)
- [ ] 5.1 Delegate: aggregateHierarchy() → Gemini
- [ ] 5.2 Delegate: verifyChecksum() → Gemini
- [ ] 5.3 Architect: เพิ่ม AdHourlyLedger Prisma model + migration
- [ ] 5.3 Delegate: appendLedgerIfChanged() → Gemini
- [ ] 5.4 Delegate: marketingMetrics.js (CON/CPA/ROAS) → Gemini
- [ ] 5.x QA: ทดสอบ checksum tolerance ±1%

### Phase 6 — Identity Resolution (ADR-025)
- [ ] 6.1 Delegate: normalizePhone() → Gemini
- [ ] 6.2 Architect: กำหนด transaction boundary
- [ ] 6.2 Delegate: resolveOrCreateCustomer() → Gemini
- [ ] 6.3 Delegate: recordLineConversion() → Gemini
- [ ] 6.x Architect: migration เพิ่ม lineId column ใน Customer

### Phase 7 — RBAC (ADR-026)
- [ ] 7.1 Delegate: rbac.js (role hierarchy + hasPermission) → Gemini
- [ ] 7.2 Delegate: authGuard.js (requireRole middleware) → Gemini
- [ ] 7.3 Architect: retrofit sensitive API routes
- [ ] 7.x Architect: อัปเดต NextAuth callback embed role ใน session

---

## Delegation Command Reference

```bash
# Quick sub-agent call (for small tasks)
gemini -p "TASK_DESCRIPTION" -o text

# With interface context via stdin
echo "INTERFACE_SPEC" | gemini -p "implement this, Node.js ESM, no explanation" -o text

# With file context (ใช้ head เพื่อประหยัด token)
head -80 src/lib/db.js | gemini -p "TASK" -o text

# Save output ไปยังไฟล์ draft
gemini -p "..." -o text > /tmp/draft_customerRepo.js
# แล้ว QA + แก้ก่อน copy ไปไฟล์จริง
```

---

## Notes สำหรับ Future Sessions

- **Working dir:** `/e/data_hub/` (crm-app อยู่ใน subdirectory)
- **Start dev:** `cd crm-app && npm run dev`
- **Start worker:** `cd crm-app && npm run worker` (terminal แยก)
- **Gemini sub-agent:** `gemini -p "..." -o text` (ติดตั้งแล้ว via npm global)
- **DB Adapter:** ตั้งค่า `DB_ADAPTER=prisma` ใน `.env` สำหรับ production mode
