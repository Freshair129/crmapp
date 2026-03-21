import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateMovementId, generateStockCountId } from '@/lib/idGenerators';

// ─── Warehouse CRUD ──────────────────────────────────────────────────────────

export async function createWarehouse({ name, code, address }) {
    try {
        const prisma = await getPrisma();
        const warehouseId = `WH-${code.toUpperCase()}`;
        return prisma.warehouse.create({
            data: { warehouseId, name, code: code.toUpperCase(), address },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to create warehouse', error);
        throw error;
    }
}

export async function getAllWarehouses(opts = {}) {
    try {
        const prisma = await getPrisma();
        const where = {};
        if (opts.isActive !== undefined) where.isActive = opts.isActive;
        return prisma.warehouse.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get warehouses', error);
        throw error;
    }
}

export async function getWarehouseById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.warehouse.findUnique({ where: { id } });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get warehouse by id', error);
        throw error;
    }
}

export async function updateWarehouse(id, data) {
    try {
        const prisma = await getPrisma();
        const allowed = {};
        if (data.name !== undefined) allowed.name = data.name;
        if (data.address !== undefined) allowed.address = data.address;
        if (data.isActive !== undefined) allowed.isActive = data.isActive;
        return prisma.warehouse.update({ where: { id }, data: allowed });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to update warehouse', error);
        throw error;
    }
}

// ─── Stock Levels ────────────────────────────────────────────────────────────

export async function getStockLevels({ warehouseId, productId, lowStockOnly } = {}) {
    try {
        const prisma = await getPrisma();
        const where = {};
        if (warehouseId) where.warehouseId = warehouseId;
        if (productId) where.productId = productId;

        let stocks = await prisma.warehouseStock.findMany({
            where,
            include: {
                product: {
                    select: { id: true, productId: true, name: true, category: true, image: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        if (lowStockOnly) {
            stocks = stocks.filter(s => s.quantity <= s.minStock);
        }

        return stocks;
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get stock levels', error);
        throw error;
    }
}

export async function getLowStockAlerts() {
    try {
        const prisma = await getPrisma();
        return prisma.warehouseStock.findMany({
            where: {
                minStock: { gt: 0 },
                quantity: { lte: prisma.warehouseStock.fields?.minStock },
            },
            include: {
                warehouse: { select: { name: true } },
                product: { select: { name: true, productId: true } },
            },
            orderBy: { quantity: 'asc' },
        });
    } catch (error) {
        // Fallback: Prisma doesn't support field-to-field comparison in where
        // Use raw query or post-filter approach
        try {
            const prisma = await getPrisma();
            const allStocks = await prisma.warehouseStock.findMany({
                where: { minStock: { gt: 0 } },
                include: {
                    warehouse: { select: { name: true } },
                    product: { select: { name: true, productId: true } },
                },
                orderBy: { quantity: 'asc' },
            });
            return allStocks.filter(s => s.quantity <= s.minStock);
        } catch (innerError) {
            logger.error('[InventoryRepo]', 'Failed to get low stock alerts', innerError);
            throw innerError;
        }
    }
}

export async function upsertMinStock(warehouseId, productId, minStock, maxStock) {
    try {
        const prisma = await getPrisma();
        return prisma.warehouseStock.upsert({
            where: {
                warehouseId_productId: { warehouseId, productId },
            },
            update: { minStock, maxStock },
            create: { warehouseId, productId, quantity: 0, minStock, maxStock },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to upsert min stock', error);
        throw error;
    }
}

// ─── Stock Movements ─────────────────────────────────────────────────────────

export async function createMovement({
    type, productId, fromWarehouseId, toWarehouseId, quantity,
    unitCost, reason, referenceId, referenceType, barcodeScanned,
    notes, performedById,
}) {
    try {
        const prisma = await getPrisma();
        const movementId = await generateMovementId();

        return prisma.$transaction(async (tx) => {
            // Check sufficient stock for ISSUE or TRANSFER
            if ((type === 'ISSUE' || type === 'TRANSFER') && fromWarehouseId) {
                const sourceStock = await tx.warehouseStock.findUnique({
                    where: {
                        warehouseId_productId: { warehouseId: fromWarehouseId, productId },
                    },
                });
                const available = sourceStock?.quantity ?? 0;
                if (available < quantity) {
                    throw new Error('Insufficient stock');
                }
            }

            // Create movement record
            const movement = await tx.stockMovement.create({
                data: {
                    movementId,
                    type,
                    productId,
                    fromWarehouseId: fromWarehouseId || null,
                    toWarehouseId: toWarehouseId || null,
                    quantity,
                    unitCost: unitCost || null,
                    reason: reason || null,
                    referenceId: referenceId || null,
                    referenceType: referenceType || null,
                    barcodeScanned: barcodeScanned || null,
                    notes: notes || null,
                    performedById: performedById || null,
                },
            });

            // Decrement source warehouse stock
            if (fromWarehouseId) {
                await tx.warehouseStock.upsert({
                    where: {
                        warehouseId_productId: { warehouseId: fromWarehouseId, productId },
                    },
                    update: { quantity: { decrement: quantity } },
                    create: { warehouseId: fromWarehouseId, productId, quantity: -quantity, minStock: 0 },
                });
            }

            // Increment destination warehouse stock
            if (toWarehouseId) {
                await tx.warehouseStock.upsert({
                    where: {
                        warehouseId_productId: { warehouseId: toWarehouseId, productId },
                    },
                    update: { quantity: { increment: quantity } },
                    create: { warehouseId: toWarehouseId, productId, quantity, minStock: 0 },
                });
            }

            return movement;
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to create movement', error);
        throw error;
    }
}

export async function getMovements(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { type, productId, warehouseId, dateFrom, dateTo, limit = 50, offset = 0 } = opts;

        const where = {};
        if (type) where.type = type;
        if (productId) where.productId = productId;
        if (warehouseId) {
            where.OR = [
                { fromWarehouseId: warehouseId },
                { toWarehouseId: warehouseId },
            ];
        }
        if (dateFrom || dateTo) {
            where.performedAt = {};
            if (dateFrom) where.performedAt.gte = new Date(dateFrom);
            if (dateTo) where.performedAt.lte = new Date(dateTo);
        }

        return prisma.stockMovement.findMany({
            where,
            include: {
                product: { select: { name: true, productId: true } },
                fromWarehouse: { select: { name: true } },
                toWarehouse: { select: { name: true } },
                performedBy: { select: { firstName: true, nickName: true } },
            },
            orderBy: { performedAt: 'desc' },
            take: limit,
            skip: offset,
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get movements', error);
        throw error;
    }
}

export async function getMovementById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.stockMovement.findUnique({
            where: { id },
            include: {
                product: true,
                fromWarehouse: true,
                toWarehouse: true,
                performedBy: true,
            },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get movement by id', error);
        throw error;
    }
}

// ─── Stock Count ─────────────────────────────────────────────────────────────

export async function createStockCount({ warehouseId, countedById, notes }) {
    try {
        const prisma = await getPrisma();
        const countId = await generateStockCountId();
        return prisma.stockCount.create({
            data: {
                countId,
                warehouseId,
                countedById,
                notes: notes || null,
            },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to create stock count', error);
        throw error;
    }
}

export async function addCountItem(stockCountId, { productId, physicalQty }) {
    try {
        const prisma = await getPrisma();

        // Get the stock count to find warehouseId
        const stockCount = await prisma.stockCount.findUnique({
            where: { id: stockCountId },
            select: { warehouseId: true },
        });
        if (!stockCount) throw new Error('Stock count not found');

        // Lookup current system quantity
        const warehouseStock = await prisma.warehouseStock.findUnique({
            where: {
                warehouseId_productId: { warehouseId: stockCount.warehouseId, productId },
            },
            select: { quantity: true },
        });
        const systemQty = warehouseStock?.quantity ?? 0;
        const variance = physicalQty - systemQty;

        return prisma.stockCountItem.upsert({
            where: {
                stockCountId_productId: { stockCountId, productId },
            },
            update: { physicalQty, systemQty, variance },
            create: { stockCountId, productId, physicalQty, systemQty, variance },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to add count item', error);
        throw error;
    }
}

export async function completeStockCount(stockCountId, approvedById) {
    try {
        const prisma = await getPrisma();

        return prisma.$transaction(async (tx) => {
            const stockCount = await tx.stockCount.findUnique({
                where: { id: stockCountId },
                include: { items: true },
            });
            if (!stockCount) throw new Error('Stock count not found');

            // For each item with variance, create adjustment movement and update stock
            for (const item of stockCount.items) {
                if (item.variance === 0) continue;

                const adjustmentQty = Math.abs(item.variance);
                const movementId = await generateMovementId();

                await tx.stockMovement.create({
                    data: {
                        movementId,
                        type: 'ADJUSTMENT',
                        productId: item.productId,
                        fromWarehouseId: item.variance < 0 ? stockCount.warehouseId : null,
                        toWarehouseId: item.variance > 0 ? stockCount.warehouseId : null,
                        quantity: adjustmentQty,
                        reason: `Stock count adjustment (${stockCount.countId})`,
                        referenceId: stockCount.countId,
                        referenceType: 'STOCK_COUNT',
                        performedById: approvedById,
                    },
                });

                // Set warehouse stock to physical quantity
                await tx.warehouseStock.upsert({
                    where: {
                        warehouseId_productId: {
                            warehouseId: stockCount.warehouseId,
                            productId: item.productId,
                        },
                    },
                    update: { quantity: item.physicalQty, lastCountAt: new Date() },
                    create: {
                        warehouseId: stockCount.warehouseId,
                        productId: item.productId,
                        quantity: item.physicalQty,
                        minStock: 0,
                        lastCountAt: new Date(),
                    },
                });
            }

            // Mark stock count as completed
            return tx.stockCount.update({
                where: { id: stockCountId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    approvedById,
                },
            });
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to complete stock count', error);
        throw error;
    }
}

export async function getStockCounts(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { warehouseId, status } = opts;
        const where = {};
        if (warehouseId) where.warehouseId = warehouseId;
        if (status) where.status = status;

        return prisma.stockCount.findMany({
            where,
            include: {
                warehouse: { select: { name: true } },
                countedBy: { select: { firstName: true, nickName: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get stock counts', error);
        throw error;
    }
}

export async function getStockCountById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.stockCount.findUnique({
            where: { id },
            include: {
                warehouse: true,
                countedBy: true,
                approvedBy: true,
                items: {
                    include: {
                        product: { select: { name: true, productId: true, category: true } },
                    },
                },
            },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get stock count by id', error);
        throw error;
    }
}

// ─── Barcode ─────────────────────────────────────────────────────────────────

export async function registerBarcode({ productId, barcode, type, isPrimary }) {
    try {
        const prisma = await getPrisma();

        // If isPrimary, unset other primaries for the same product
        if (isPrimary) {
            await prisma.productBarcode.updateMany({
                where: { productId, isPrimary: true },
                data: { isPrimary: false },
            });
        }

        return prisma.productBarcode.create({
            data: { productId, barcode, type: type || 'EAN13', isPrimary: isPrimary ?? false },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to register barcode', error);
        throw error;
    }
}

export async function lookupByBarcode(code) {
    try {
        const prisma = await getPrisma();
        return prisma.productBarcode.findUnique({
            where: { barcode: code },
            include: {
                product: {
                    include: { warehouseStocks: true },
                },
            },
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to lookup barcode', error);
        throw error;
    }
}

export async function getBarcodesByProduct(productId) {
    try {
        const prisma = await getPrisma();
        return prisma.productBarcode.findMany({
            where: { productId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
    } catch (error) {
        logger.error('[InventoryRepo]', 'Failed to get barcodes by product', error);
        throw error;
    }
}
