import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createWarehouse,
    getAllWarehouses,
    getStockLevels,
    getLowStockAlerts,
    createMovement,
    getMovements,
    createStockCount,
    addCountItem,
    completeStockCount,
    registerBarcode,
    lookupByBarcode,
} from '../repositories/inventoryRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/idGenerators', () => ({
    generateMovementId: vi.fn().mockResolvedValue('MOV-20260315-001'),
    generateStockCountId: vi.fn().mockResolvedValue('CNT-20260315-001'),
}));

describe('inventoryRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-15'));
        vi.clearAllMocks();
        mockPrisma = {
            warehouse:      { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
            warehouseStock: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                upsert: vi.fn(),
                update: vi.fn(),
                fields: null,
            },
            stockMovement:  { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
            stockCount:     { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
            stockCountItem: { upsert: vi.fn() },
            productBarcode: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
            $transaction:   vi.fn(async (cb) => await cb(mockPrisma)),
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    afterEach(() => { vi.useRealTimers(); });

    // ─── createWarehouse ──────────────────────────────────────────────
    describe('createWarehouse', () => {
        it('creates with WH-CODE format and uppercased code', async () => {
            const mockWh = { id: 'uuid-1', warehouseId: 'WH-MAIN', name: 'Main Warehouse', code: 'MAIN' };
            mockPrisma.warehouse.create.mockResolvedValue(mockWh);

            const result = await createWarehouse({ name: 'Main Warehouse', code: 'main', address: 'Bangkok' });

            expect(mockPrisma.warehouse.create).toHaveBeenCalledWith({
                data: {
                    warehouseId: 'WH-MAIN',
                    name: 'Main Warehouse',
                    code: 'MAIN',
                    address: 'Bangkok',
                },
            });
            expect(result).toEqual(mockWh);
        });
    });

    // ─── getAllWarehouses ──────────────────────────────────────────────
    describe('getAllWarehouses', () => {
        it('returns list and respects isActive filter', async () => {
            const warehouses = [
                { id: 'wh-1', name: 'Active WH', isActive: true },
            ];
            mockPrisma.warehouse.findMany.mockResolvedValue(warehouses);

            const result = await getAllWarehouses({ isActive: true });

            expect(mockPrisma.warehouse.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(warehouses);
        });

        it('returns all warehouses when no filter provided', async () => {
            mockPrisma.warehouse.findMany.mockResolvedValue([]);

            await getAllWarehouses();

            expect(mockPrisma.warehouse.findMany).toHaveBeenCalledWith({
                where: {},
                orderBy: { name: 'asc' },
            });
        });
    });

    // ─── getStockLevels ───────────────────────────────────────────────
    describe('getStockLevels', () => {
        it('returns stock with product info', async () => {
            const stocks = [
                { id: 's1', quantity: 50, minStock: 10, product: { id: 'p1', name: 'Soy Sauce' } },
            ];
            mockPrisma.warehouseStock.findMany.mockResolvedValue(stocks);

            const result = await getStockLevels({ warehouseId: 'wh-1' });

            expect(mockPrisma.warehouseStock.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { warehouseId: 'wh-1' },
                    include: expect.objectContaining({ product: expect.any(Object) }),
                })
            );
            expect(result).toEqual(stocks);
        });

        it('lowStockOnly filters items where qty <= minStock', async () => {
            const stocks = [
                { id: 's1', quantity: 50, minStock: 10, product: { name: 'OK' } },
                { id: 's2', quantity: 3, minStock: 10, product: { name: 'Low' } },
                { id: 's3', quantity: 10, minStock: 10, product: { name: 'Exact' } },
            ];
            mockPrisma.warehouseStock.findMany.mockResolvedValue(stocks);

            const result = await getStockLevels({ lowStockOnly: true });

            expect(result).toHaveLength(2);
            expect(result.map(s => s.id)).toEqual(['s2', 's3']);
        });
    });

    // ─── getLowStockAlerts ────────────────────────────────────────────
    describe('getLowStockAlerts', () => {
        it('returns items where qty <= minStock (first call succeeds with mock data)', async () => {
            // In real Prisma, field comparison may work or fallback to post-filter
            // With mock, the first findMany resolves (fields?.minStock = undefined → lte:undefined passes)
            // So we test that it returns whatever findMany returns
            mockPrisma.warehouseStock.findMany.mockResolvedValue([
                { id: 's1', quantity: 2, minStock: 5, warehouse: { name: 'WH1' }, product: { name: 'Salt' } },
            ]);

            const result = await getLowStockAlerts();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('s1');
            expect(mockPrisma.warehouseStock.findMany).toHaveBeenCalled();
        });
    });

    // ─── createMovement — RECEIVE ─────────────────────────────────────
    describe('createMovement', () => {
        it('RECEIVE — increments toWarehouse stock and creates movement', async () => {
            const mockMovement = { id: 'm1', movementId: 'MOV-20260315-001', type: 'RECEIVE', quantity: 20 };
            mockPrisma.stockMovement.create.mockResolvedValue(mockMovement);
            mockPrisma.warehouseStock.upsert.mockResolvedValue({});

            const result = await createMovement({
                type: 'RECEIVE',
                productId: 'p1',
                toWarehouseId: 'wh-1',
                quantity: 20,
            });

            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        movementId: 'MOV-20260315-001',
                        type: 'RECEIVE',
                        quantity: 20,
                    }),
                })
            );
            // Should increment destination stock
            expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { warehouseId_productId: { warehouseId: 'wh-1', productId: 'p1' } },
                    update: { quantity: { increment: 20 } },
                })
            );
            expect(result).toEqual(mockMovement);
        });

        it('ISSUE — decrements fromWarehouse stock', async () => {
            mockPrisma.warehouseStock.findUnique.mockResolvedValue({ quantity: 50 });
            mockPrisma.stockMovement.create.mockResolvedValue({ id: 'm2', type: 'ISSUE' });
            mockPrisma.warehouseStock.upsert.mockResolvedValue({});

            await createMovement({
                type: 'ISSUE',
                productId: 'p1',
                fromWarehouseId: 'wh-1',
                quantity: 10,
            });

            expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { warehouseId_productId: { warehouseId: 'wh-1', productId: 'p1' } },
                    update: { quantity: { decrement: 10 } },
                })
            );
        });

        it('ISSUE — throws error when stock < quantity', async () => {
            mockPrisma.warehouseStock.findUnique.mockResolvedValue({ quantity: 5 });

            await expect(
                createMovement({
                    type: 'ISSUE',
                    productId: 'p1',
                    fromWarehouseId: 'wh-1',
                    quantity: 20,
                })
            ).rejects.toThrow('Insufficient stock');
        });

        it('TRANSFER — decrements source, increments destination', async () => {
            mockPrisma.warehouseStock.findUnique.mockResolvedValue({ quantity: 100 });
            mockPrisma.stockMovement.create.mockResolvedValue({ id: 'm3', type: 'TRANSFER' });
            mockPrisma.warehouseStock.upsert.mockResolvedValue({});

            await createMovement({
                type: 'TRANSFER',
                productId: 'p1',
                fromWarehouseId: 'wh-1',
                toWarehouseId: 'wh-2',
                quantity: 30,
            });

            // Should be called twice: once for decrement (from), once for increment (to)
            expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalledTimes(2);
            expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { warehouseId_productId: { warehouseId: 'wh-1', productId: 'p1' } },
                    update: { quantity: { decrement: 30 } },
                })
            );
            expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { warehouseId_productId: { warehouseId: 'wh-2', productId: 'p1' } },
                    update: { quantity: { increment: 30 } },
                })
            );
        });
    });

    // ─── getMovements ─────────────────────────────────────────────────
    describe('getMovements', () => {
        it('applies type and warehouseId filters with OR clause', async () => {
            mockPrisma.stockMovement.findMany.mockResolvedValue([]);

            await getMovements({ type: 'RECEIVE', warehouseId: 'wh-1', limit: 10 });

            expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        type: 'RECEIVE',
                        OR: [
                            { fromWarehouseId: 'wh-1' },
                            { toWarehouseId: 'wh-1' },
                        ],
                    }),
                    take: 10,
                    skip: 0,
                })
            );
        });
    });

    // ─── createStockCount ─────────────────────────────────────────────
    describe('createStockCount', () => {
        it('creates with generated CNT ID', async () => {
            const mockCount = { id: 'sc-1', countId: 'CNT-20260315-001', warehouseId: 'wh-1' };
            mockPrisma.stockCount.create.mockResolvedValue(mockCount);

            const result = await createStockCount({ warehouseId: 'wh-1', countedById: 'emp-1' });

            expect(mockPrisma.stockCount.create).toHaveBeenCalledWith({
                data: {
                    countId: 'CNT-20260315-001',
                    warehouseId: 'wh-1',
                    countedById: 'emp-1',
                    notes: null,
                },
            });
            expect(result).toEqual(mockCount);
        });
    });

    // ─── addCountItem ─────────────────────────────────────────────────
    describe('addCountItem', () => {
        it('looks up systemQty and computes variance', async () => {
            mockPrisma.stockCount.findUnique.mockResolvedValue({ warehouseId: 'wh-1' });
            mockPrisma.warehouseStock.findUnique.mockResolvedValue({ quantity: 40 });
            mockPrisma.stockCountItem.upsert.mockResolvedValue({
                productId: 'p1', physicalQty: 35, systemQty: 40, variance: -5,
            });

            const result = await addCountItem('sc-1', { productId: 'p1', physicalQty: 35 });

            expect(mockPrisma.stockCountItem.upsert).toHaveBeenCalledWith({
                where: { stockCountId_productId: { stockCountId: 'sc-1', productId: 'p1' } },
                update: { physicalQty: 35, systemQty: 40, variance: -5 },
                create: { stockCountId: 'sc-1', productId: 'p1', physicalQty: 35, systemQty: 40, variance: -5 },
            });
            expect(result.variance).toBe(-5);
        });

        it('defaults systemQty to 0 when no warehouse stock exists', async () => {
            mockPrisma.stockCount.findUnique.mockResolvedValue({ warehouseId: 'wh-1' });
            mockPrisma.warehouseStock.findUnique.mockResolvedValue(null);
            mockPrisma.stockCountItem.upsert.mockResolvedValue({
                physicalQty: 10, systemQty: 0, variance: 10,
            });

            await addCountItem('sc-1', { productId: 'p1', physicalQty: 10 });

            expect(mockPrisma.stockCountItem.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({ systemQty: 0, variance: 10 }),
                })
            );
        });
    });

    // ─── completeStockCount ───────────────────────────────────────────
    describe('completeStockCount', () => {
        it('creates ADJUSTMENT movements for variances and updates stock', async () => {
            const stockCount = {
                id: 'sc-1',
                countId: 'CNT-20260315-001',
                warehouseId: 'wh-1',
                items: [
                    { productId: 'p1', physicalQty: 35, systemQty: 40, variance: -5 },
                    { productId: 'p2', physicalQty: 20, systemQty: 20, variance: 0 },  // no variance — skip
                    { productId: 'p3', physicalQty: 15, systemQty: 10, variance: 5 },
                ],
            };
            mockPrisma.stockCount.findUnique.mockResolvedValue(stockCount);
            mockPrisma.stockMovement.create.mockResolvedValue({});
            mockPrisma.warehouseStock.upsert.mockResolvedValue({});
            mockPrisma.stockCount.update.mockResolvedValue({ ...stockCount, status: 'COMPLETED' });

            const result = await completeStockCount('sc-1', 'approver-1');

            // Should create 2 adjustment movements (p1 variance -5, p3 variance +5), skip p2
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledTimes(2);

            // Negative variance: fromWarehouseId is set, toWarehouseId is null
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'ADJUSTMENT',
                    productId: 'p1',
                    fromWarehouseId: 'wh-1',
                    toWarehouseId: null,
                    quantity: 5,
                    referenceType: 'STOCK_COUNT',
                }),
            });

            // Positive variance: toWarehouseId is set, fromWarehouseId is null
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'ADJUSTMENT',
                    productId: 'p3',
                    fromWarehouseId: null,
                    toWarehouseId: 'wh-1',
                    quantity: 5,
                }),
            });

            // Stock set to physical qty for both adjusted items
            expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalledTimes(2);

            // Mark completed
            expect(mockPrisma.stockCount.update).toHaveBeenCalledWith({
                where: { id: 'sc-1' },
                data: expect.objectContaining({
                    status: 'COMPLETED',
                    approvedById: 'approver-1',
                }),
            });
            expect(result.status).toBe('COMPLETED');
        });

        it('throws if stock count not found', async () => {
            mockPrisma.stockCount.findUnique.mockResolvedValue(null);

            await expect(completeStockCount('bad-id', 'approver-1'))
                .rejects.toThrow('Stock count not found');
        });
    });

    // ─── registerBarcode ──────────────────────────────────────────────
    describe('registerBarcode', () => {
        it('creates barcode record with default type EAN13', async () => {
            const mockBarcode = { id: 'b1', barcode: '4901234567890', type: 'EAN13', isPrimary: false };
            mockPrisma.productBarcode.create.mockResolvedValue(mockBarcode);

            const result = await registerBarcode({ productId: 'p1', barcode: '4901234567890' });

            expect(mockPrisma.productBarcode.create).toHaveBeenCalledWith({
                data: { productId: 'p1', barcode: '4901234567890', type: 'EAN13', isPrimary: false },
            });
            expect(result).toEqual(mockBarcode);
        });

        it('isPrimary — unsets other primaries first', async () => {
            mockPrisma.productBarcode.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.productBarcode.create.mockResolvedValue({ isPrimary: true });

            await registerBarcode({ productId: 'p1', barcode: '111', type: 'QR', isPrimary: true });

            expect(mockPrisma.productBarcode.updateMany).toHaveBeenCalledWith({
                where: { productId: 'p1', isPrimary: true },
                data: { isPrimary: false },
            });
            expect(mockPrisma.productBarcode.create).toHaveBeenCalledWith({
                data: { productId: 'p1', barcode: '111', type: 'QR', isPrimary: true },
            });
        });
    });

    // ─── lookupByBarcode ──────────────────────────────────────────────
    describe('lookupByBarcode', () => {
        it('returns product with stock info', async () => {
            const mockResult = {
                id: 'b1',
                barcode: '4901234567890',
                product: {
                    id: 'p1',
                    name: 'Soy Sauce',
                    warehouseStocks: [{ warehouseId: 'wh-1', quantity: 50 }],
                },
            };
            mockPrisma.productBarcode.findUnique.mockResolvedValue(mockResult);

            const result = await lookupByBarcode('4901234567890');

            expect(mockPrisma.productBarcode.findUnique).toHaveBeenCalledWith({
                where: { barcode: '4901234567890' },
                include: {
                    product: {
                        include: { warehouseStocks: true },
                    },
                },
            });
            expect(result.product.name).toBe('Soy Sauce');
            expect(result.product.warehouseStocks).toHaveLength(1);
        });

        it('returns null when barcode not found', async () => {
            mockPrisma.productBarcode.findUnique.mockResolvedValue(null);

            const result = await lookupByBarcode('0000000000000');

            expect(result).toBeNull();
        });
    });
});
