# VALIDATOR — Phase 16 QA Checklist

> **วันที่:** 2026-03-15
> **Phase:** 16 — Recipe + Package + Real-time Stock Deduction
> **ทีม:** Claude (design) + Claude (implementation)

---

## สารบัญ

1. [Pre-Validation Setup](#1-pre-validation-setup)
2. [Schema Validation](#2-schema-validation)
3. [Recipe API Tests](#3-recipe-api-tests)
4. [Package API Tests](#4-package-api-tests)
5. [Stock Deduction Tests](#5-stock-deduction-tests)
6. [UI Smoke Tests](#6-ui-smoke-tests)
7. [Edge Cases & Error Handling](#7-edge-cases--error-handling)
8. [Regression Checklist](#8-regression-checklist)

---

## 1. Pre-Validation Setup

### Prerequisites
```bash
cd /Users/ideab/Desktop/crm
docker compose up -d        # PostgreSQL + Redis
npm run dev                 # Next.js dev server
```

### Seed test data (ถ้ายังไม่มี)
```bash
# ตรวจว่ามี ingredient อยู่แล้ว
curl http://localhost:3000/api/kitchen/ingredients | jq length

# ตรวจว่ามี product (course) อยู่แล้ว
curl http://localhost:3000/api/products | jq length
```

---

## 2. Schema Validation

ตรวจว่า tables ถูกสร้างใน DB:

```bash
npx prisma studio
# ตรวจ tables: recipes, course_menus, recipe_ingredients, recipe_equipment
# ตรวจ tables: packages, package_courses, package_gifts
# ตรวจ tables: package_enrollments, package_enrollment_courses
```

หรือ SQL โดยตรง:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'recipes', 'course_menus', 'recipe_ingredients', 'recipe_equipment',
  'packages', 'package_courses', 'package_gifts',
  'package_enrollments', 'package_enrollment_courses'
);
-- Expected: 9 rows
```

---

## 3. Recipe API Tests

### 3.1 Create Recipe (POST /api/recipes)

```bash
curl -s -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ราเมนมิโซ",
    "category": "JP",
    "sellingPrice": 450,
    "estimatedCost": 120,
    "ingredients": [
      {
        "ingredientId": "<INGREDIENT_UUID>",
        "qtyPerPerson": 200,
        "unit": "กรัม"
      }
    ],
    "equipment": [
      {
        "name": "หม้อต้มราเมน 3L",
        "unit": "ใบ",
        "qtyRequired": 2,
        "currentStock": 5,
        "minStock": 2
      }
    ]
  }' | jq .
```

**Expected:**
- `recipeId` format: `RCP-2026-001`
- `ingredients[0].ingredient` populated (joined)
- `equipment[0].currentStock` = 5
- HTTP 201

### 3.2 Get All Recipes (GET /api/recipes)

```bash
curl http://localhost:3000/api/recipes | jq 'length'
# Expected: >= 1

curl "http://localhost:3000/api/recipes?category=JP" | jq '.[0].category'
# Expected: "JP"

curl "http://localhost:3000/api/recipes?search=ราเมน" | jq '.[0].name'
# Expected: "ราเมนมิโซ"
```

### 3.3 Get Recipe by ID (GET /api/recipes/[id])

```bash
RECIPE_ID=$(curl -s http://localhost:3000/api/recipes | jq -r '.[0].id')
curl http://localhost:3000/api/recipes/$RECIPE_ID | jq '.recipeId'
# Expected: "RCP-2026-001"
```

### 3.4 Update Recipe (PATCH /api/recipes/[id])

```bash
curl -s -X PATCH http://localhost:3000/api/recipes/$RECIPE_ID \
  -H "Content-Type: application/json" \
  -d '{"estimatedCost": 135}' | jq '.estimatedCost'
# Expected: 135
```

---

## 4. Package API Tests

### 4.1 Create Package (POST /api/packages)

```bash
PRODUCT_ID=$(curl -s http://localhost:3000/api/products | jq -r '.[0].id')
PRODUCT_PRICE=$(curl -s http://localhost:3000/api/products | jq -r '.[0].price')

curl -s -X POST http://localhost:3000/api/packages \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"V School Starter Pack\",
    \"originalPrice\": $PRODUCT_PRICE,
    \"packagePrice\": $(echo "$PRODUCT_PRICE * 0.85" | bc),
    \"courses\": [
      {
        \"productId\": \"$PRODUCT_ID\",
        \"isRequired\": true,
        \"isLocked\": false,
        \"sortOrder\": 0
      }
    ],
    \"gifts\": [
      {\"name\": \"ผ้ากันเปื้อน V School\", \"qty\": 1, \"estimatedCost\": 250}
    ]
  }" | jq .
```

**Expected:**
- `packageId` format: `PKG-2026-001`
- `courses[0].product.name` populated
- `gifts[0].name` = "ผ้ากันเปื้อน V School"
- `originalPrice` > `packagePrice` (discount applied)
- HTTP 201

### 4.2 Get All Packages

```bash
curl http://localhost:3000/api/packages | jq 'length'
# Expected: >= 1

curl "http://localhost:3000/api/packages?isActive=true" | jq '.[0].isActive'
# Expected: true
```

### 4.3 Create Package Enrollment (POST /api/packages/enrollments)

```bash
PACKAGE_ID=$(curl -s http://localhost:3000/api/packages | jq -r '.[0].id')
CUSTOMER_ID=$(curl -s http://localhost:3000/api/customers | jq -r '.data[0].id // .[0].id')

curl -s -X POST http://localhost:3000/api/packages/enrollments \
  -H "Content-Type: application/json" \
  -d "{
    \"packageId\": \"$PACKAGE_ID\",
    \"customerId\": \"$CUSTOMER_ID\",
    \"totalPrice\": 59390,
    \"selectedCourseIds\": [\"$PRODUCT_ID\"]
  }" | jq .
```

**Expected:**
- `enrollmentId` format: `PENR-2026-0001`
- `swapUsedAt` = null (ยังไม่ swap)
- HTTP 201

### 4.4 Get Enrollments by Customer

```bash
curl "http://localhost:3000/api/packages/enrollments?customerId=$CUSTOMER_ID" | jq 'length'
# Expected: >= 1
```

### 4.5 Swap Course (POST /api/packages/[enrollmentId]/swap)

```bash
ENROLLMENT_ID=$(curl -s "http://localhost:3000/api/packages/enrollments?customerId=$CUSTOMER_ID" | jq -r '.[0].id')
PRODUCT_ID_2=$(curl -s http://localhost:3000/api/products | jq -r '.[1].id')  # ต้องมี 2 courses

curl -s -X POST "http://localhost:3000/api/packages/$ENROLLMENT_ID/swap" \
  -H "Content-Type: application/json" \
  -d "{\"oldProductId\": \"$PRODUCT_ID\", \"newProductId\": \"$PRODUCT_ID_2\"}" | jq .
```

**Expected (first swap):**
- `swapUsedAt` != null
- `selectedCourses` มี `wasSwapped: true` สำหรับ newProductId
- HTTP 200

**Expected (second swap on same enrollment):**
```bash
curl -s -X POST "http://localhost:3000/api/packages/$ENROLLMENT_ID/swap" \
  -H "Content-Type: application/json" \
  -d "{\"oldProductId\": \"$PRODUCT_ID_2\", \"newProductId\": \"$PRODUCT_ID\"}" | jq .status
# Expected: 409 { "error": "Swap already used for this enrollment" }
```

---

## 5. Stock Deduction Tests

### 5.1 Setup: Link Recipe to Course

```bash
# CourseMenu: link recipe to course (productId + recipeId)
# ทำผ่าน RecipePage UI หรือ Prisma Studio
```

### 5.2 Record stock ก่อน complete

```bash
INGREDIENT_ID=$(curl -s http://localhost:3000/api/kitchen/ingredients | jq -r '.[0].id')
BEFORE=$(curl -s http://localhost:3000/api/kitchen/ingredients | jq -r '.[0].currentStock')
echo "Stock before: $BEFORE"
```

### 5.3 Complete a Schedule

```bash
SCHEDULE_ID=$(curl -s "http://localhost:3000/api/schedules?upcoming=30" | jq -r '.[0].id')

curl -s -X POST "http://localhost:3000/api/schedules/$SCHEDULE_ID/complete" \
  -H "Content-Type: application/json" \
  -d '{"studentCount": 5}' | jq .
```

**Expected:**
- `schedule.status` = "COMPLETED"
- `ingredientsDeducted` >= 0
- `equipmentDeducted` >= 0
- `studentCount` = 5

### 5.4 Verify stock deduction

```bash
AFTER=$(curl -s http://localhost:3000/api/kitchen/ingredients | jq -r '.[0].currentStock')
echo "Stock after: $AFTER"
# Expected: AFTER < BEFORE (ถ้ามี recipe linked)
```

### 5.5 Complete ซ้ำ → 409

```bash
curl -s -X POST "http://localhost:3000/api/schedules/$SCHEDULE_ID/complete" \
  -H "Content-Type: application/json" \
  -d '{"studentCount": 3}' | jq .
# Expected: { "error": "Session already completed" } HTTP 409
```

---

## 6. UI Smoke Tests

### 6.1 เมนูสูตร (RecipePage)

- [ ] Sidebar แสดง icon BookOpen + label "เมนูสูตร"
- [ ] คลิกเข้าหน้าแล้วโหลดข้อมูลได้ (ไม่ crash)
- [ ] กด "เพิ่มสูตร" → modal เปิด
- [ ] กรอกข้อมูลและ submit → card ใหม่ปรากฏ
- [ ] คลิก expand card → วัตถุดิบ + อุปกรณ์แสดงถูกต้อง
- [ ] รายการที่ `currentStock < minStock` → badge "สต็อกต่ำ" แดง
- [ ] ค้นหาชื่อสูตร → filter ทำงาน
- [ ] Filter หมวดหมู่ JP/TH → ใช้งานได้

### 6.2 แพ็กเกจ (PackagePage)

- [ ] Sidebar แสดง icon Gift + label "แพ็กเกจ"
- [ ] คลิกเข้าหน้าแล้วโหลดข้อมูลได้
- [ ] กด "สร้างแพ็กเกจ" → modal เปิด
- [ ] เลือก course → `originalPrice` คำนวณอัตโนมัติ
- [ ] กรอก packagePrice < originalPrice → discount % แสดงถูกต้อง
- [ ] เพิ่ม swapGroup → แสดง swap group info ใน card
- [ ] เพิ่มของแถม → แสดงใน "ของแถม" section
- [ ] Submit → card ใหม่ปรากฏพร้อม packageId

---

## 7. Edge Cases & Error Handling

| Case | Input | Expected |
|---|---|---|
| Recipe ไม่มี name | `POST /api/recipes` `{}` | 400 `name is required` |
| Package ไม่มี price | `POST /api/packages` `{name:"X"}` | 400 `originalPrice and packagePrice are required` |
| Recipe ID ไม่มีใน DB | `GET /api/recipes/invalid-uuid` | 404 `Recipe not found` |
| Package Enrollment ไม่มี customerId | `GET /api/packages/enrollments` (no query) | 400 `customerId is required` |
| Complete schedule ที่ CANCELLED | `POST /api/schedules/[cancelled_id]/complete` | 409 `Cannot complete a cancelled session` |
| Swap ครั้งที่ 2 | `POST /api/packages/[enrollment_id]/swap` (ครั้งที่ 2) | 409 `Swap already used` |
| Complete session ที่ไม่มี recipe linked | `POST /api/schedules/[id]/complete` | 200 (no deductions, status = COMPLETED) |
| studentCount = 0 | `POST /api/schedules/[id]/complete` `{studentCount: 0}` | fallback เป็น confirmedStudents หรือ 1 |

---

## 8. Regression Checklist

ตรวจว่า Phase 16 ไม่ทำลาย features เดิม:

- [ ] `GET /api/schedules` ยังคืน schedules ปกติ (ไม่มี sessionType ถ้าไม่ได้ set)
- [ ] `GET /api/products` ยังคืน products ปกติ (hours = null ถ้าไม่ได้ set)
- [ ] `GET /api/kitchen/ingredients` ยังแสดง ingredients ครบ
- [ ] KitchenStockPanel UI โหลดได้ปกติ
- [ ] AssetPanel UI โหลดได้ปกติ
- [ ] ScheduleCalendar UI โหลดได้ปกติ
- [ ] สร้าง course schedule ใหม่ได้ปกติ (ผ่าน ScheduleCalendar)
- [ ] Unified Inbox โหลดได้ (ไม่ crash จาก schema change)
- [ ] `npm run build` ผ่านโดยไม่มี error

---

## หมายเหตุ

- **Auth required:** ทุก API endpoint ต้องมี session — test ผ่าน browser ที่ login แล้ว หรือ use cookie จาก login API
- **Prisma Studio** ใช้ validate ข้อมูลใน DB โดยตรง: `npx prisma studio`
- **Stock deduction** ทดสอบได้เต็มที่ก็ต่อเมื่อมี: CourseSchedule ที่ link Product → Recipe → RecipeIngredient

---

*อัปเดต: 2026-03-15 | Phase 16 QA*
