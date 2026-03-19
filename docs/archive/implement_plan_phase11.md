# Implementation Plan — Phase 11: UI Component Wiring
_Date: 2026-03-11_

## Goal
เชื่อมต่อ 7 UI components ใหม่ให้ทำงานกับ real backend และ database แทน mock data

## Task Map

```
Backend APIs (B)         →  UI Components (A)
─────────────────────────────────────────────────
B1: Products CRUD API    →  A2: InventoryManager
B2: Executive Stats API  →  A4: ExecutiveAnalytics
[existing] /api/orders   →  A1: AuditHistory
[existing] /api/products →  A3: PremiumPOS (read)
[existing] /api/orders   →  A3: PremiumPOS (write)
```

## Tasks

### B1 — Products Write API
**File:** `src/app/api/products/route.js` (เพิ่ม POST)
**File:** `src/app/api/products/[id]/route.js` (สร้างใหม่: PUT, DELETE)

Interface:
```js
// POST /api/products
// Body: { name, price, category, description?, image?, duration?, productId? }
// Returns: Product (201)

// PUT /api/products/[id]
// Body: Partial<{ name, price, category, description, image, duration, isActive }>
// Returns: Product (200)

// DELETE /api/products/[id]
// Soft-delete: set isActive = false
// Returns: { success: true } (200)
```
Pattern: ใช้ `getPrisma()`, `logger`, `NextResponse`, error → 500

---

### B2 — Executive Analytics API
**File:** `src/app/api/analytics/executive/route.js` (สร้างใหม่)

Interface:
```js
// GET /api/analytics/executive?timeframe=today|week|month
// Returns:
{
  totalRevenue: number,      // SUM orders.totalAmount WHERE status='CLOSED'
  ordersCount: number,       // COUNT orders WHERE status='CLOSED'
  avgTicket: number,         // totalRevenue / ordersCount (0 if no orders)
  activeSessions: number,    // COUNT conversations WHERE status='OPEN'
  conversionRate: number,    // ordersCount / activeSessions * 100 (%)
  revenueChange: number,     // % change vs previous equivalent period
}
```
- timeframe=today → today vs yesterday
- timeframe=week  → last 7 days vs 7 days before
- timeframe=month → last 30 days vs 30 days before

---

### A1 — Wire AuditHistory.js
**File:** `src/components/AuditHistory.js`

Changes:
- ลบ `MOCK_ORDERS` array
- เพิ่ม `const [orders, setOrders] = useState([])`
- เพิ่ม `const [loading, setLoading] = useState(true)`
- `useEffect` → `fetch('/api/orders?limit=50')` → `setOrders(data)`
- แสดง loading state (skeleton or spinner)
- แสดง order.customer.firstName + lastName แทน hardcode
- แสดง totalAmount จาก API

---

### A2 — Wire InventoryManager.js
**File:** `src/components/InventoryManager.js`

Changes:
- ลบ `INITIAL_PRODUCTS`
- `useEffect` → `fetch('/api/products')` → `setProducts(data)`
- `handleSave` →
  - ถ้า editingProduct: `PUT /api/products/:id`
  - ถ้า new: `POST /api/products`
  - success → refetch products
- `handleDelete` → `DELETE /api/products/:id` → refetch
- เพิ่ม loading + error states

---

### A3 — Wire PremiumPOS.js
**File:** `src/components/PremiumPOS.js`

Changes:
- ลบ `MOCK_PRODUCTS`
- `useEffect` → `fetch('/api/products?category=')` → `setProducts(data)`
- `handleCheckout`:
  1. เปิด customer lookup modal
  2. User กรอก phone number → `fetch('/api/customers?phone=<phone>')`
  3. ถ้าพบ customer → ใช้ customerId
  4. ถ้าไม่พบ → แจ้งเตือน "ลูกค้าไม่พบ กรุณาลงทะเบียนก่อน"
  5. ถ้ามี customerId → `POST /api/orders` { customerId, items, totalAmount }
  6. Success → clear cart + show success modal

---

### A4 — Wire ExecutiveAnalytics.js
**File:** `src/components/ExecutiveAnalytics.js`

Changes:
- ลบ hardcoded stats
- เพิ่ม `const [stats, setStats] = useState(null)`
- `useEffect` → `fetch('/api/analytics/executive?timeframe=week')` → `setStats(data)`
- Map API response → UI cards (totalRevenue, ordersCount, avgTicket, activeSessions)
- แสดง revenueChange เป็น % up/down

---

## Execution Order

```
Parallel Batch 1:
  gemini B1 → docs/phase11_tasks/out_B1_products_api.js
  gemini B2 → docs/phase11_tasks/out_B2_executive_api.js
  gemini A1 → docs/phase11_tasks/out_A1_audit_history.js

Sequential:
  gemini A2 (ใช้ B1 interface)  → docs/phase11_tasks/out_A2_inventory.js
  gemini A3 (ใช้ products API)  → docs/phase11_tasks/out_A3_pos.js
  gemini A4 (ใช้ B2 interface)  → docs/phase11_tasks/out_A4_executive.js

Apply:
  Review outputs → apply to src/
```

## Definition of Done

- [ ] `GET /api/products` returns real DB data in InventoryManager
- [ ] `POST/PUT/DELETE /api/products` persists to DB
- [ ] AuditHistory shows real orders from DB
- [ ] PremiumPOS loads real products, checkout creates real Order in DB
- [ ] ExecutiveAnalytics shows live stats from DB
- [ ] No mock/hardcoded data remains in any wired component
