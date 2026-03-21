# ADR-048: Inventory Control & Distribution System

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Boss + Claude

## Context

ระบบเดิมมี KitchenStockPanel สำหรับจัดการวัตถุดิบครัว (Ingredient + IngredientLot / FEFO) แต่ไม่มีระบบคลังสินค้าสำหรับ **สินค้าขาย** (อุปกรณ์, merchandise, course packages) ที่ track:
- รับเข้า / จ่ายออก
- Transfer ระหว่างคลัง
- ตรวจนับ / Audit
- Min stock alert
- Barcode / QR

## Decision

เพิ่ม **Inventory Control & Distribution** domain ใหม่ แยกจาก Kitchen domain:

### Domain Boundary
| Domain | Model | Tracks |
|--------|-------|--------|
| **Kitchen** (เดิม) | Ingredient, IngredientLot | วัตถุดิบ, FEFO lots |
| **Inventory** (ใหม่) | Warehouse, WarehouseStock, StockMovement | สินค้าขาย (Product), multi-warehouse |

### New Models (6)
1. **Warehouse** — คลังสินค้า (WH-[CODE])
2. **WarehouseStock** — stock level per product per warehouse + minStock/maxStock
3. **StockMovement** — ทุกการเคลื่อนไหว (RECEIVE/ISSUE/TRANSFER/ADJUSTMENT/RETURN)
4. **StockCount** — session ตรวจนับ (CNT-YYYYMMDD-NNN)
5. **StockCountItem** — รายการนับ per product (systemQty vs physicalQty → variance)
6. **ProductBarcode** — barcode/QR registry

### Movement Types
| Type | fromWarehouse | toWarehouse | Description |
|------|---------------|-------------|-------------|
| RECEIVE | null | ✓ | รับสินค้าเข้าคลัง |
| ISSUE | ✓ | null | จ่ายสินค้าออก (ขาย, เสียหาย) |
| TRANSFER | ✓ | ✓ | ย้ายระหว่างคลัง |
| ADJUSTMENT | varies | varies | ปรับยอดจากการนับ |
| RETURN | null | ✓ | รับคืนสินค้า |

### Transaction Safety
- `createMovement()` ใช้ `prisma.$transaction` — atomic decrement/increment
- ISSUE/TRANSFER ต้องเช็ค stock >= quantity ก่อน (throw if insufficient)
- `completeStockCount()` ใช้ $transaction — auto-create ADJUSTMENT movements for variances

### ID Formats
- Warehouse: `WH-[CODE]` (manual, e.g. WH-HQ)
- Movement: `MOV-[YYYYMMDD]-[NNN]` (auto)
- Stock Count: `CNT-[YYYYMMDD]-[NNN]` (auto)

## Consequences

### Positive
- Multi-warehouse support ตั้งแต่ต้น
- Full audit trail ทุก movement
- Barcode/QR ready สำหรับ scan
- Stock count reconciliation อัตโนมัติ

### Negative
- Product model มี relation เพิ่ม 4 ตัว (warehouseStocks, stockMovements, stockCountItems, barcodes)
- Employee model มี relation เพิ่ม 3 ตัว

### Integration Points
- POS: อนาคตสามารถ auto-create ISSUE movement เมื่อขายสินค้า (Phase 2)
- Package: PackageGift ที่เป็นสินค้าจริงสามารถ trigger ISSUE movement ได้

## Files
- `prisma/schema.prisma` — 6 new models + updated Product/Employee relations
- `src/lib/idGenerators.js` — generateMovementId(), generateStockCountId()
- `src/lib/repositories/inventoryRepo.js` — NEW
- `src/app/api/inventory/*` — 11 route files
- `src/components/InventoryControlPanel.js` — NEW (5 tabs)
- `src/components/Sidebar.js` — add "คลังสินค้า" menu item
- `src/app/page.js` — add inventory-control view
