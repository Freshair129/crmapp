import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

async function generatePurchaseRequestId() {
    const prisma = await getPrisma();
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');
    const prefix = `PR-${dateStr}-`;
    const last = await prisma.purchaseRequest.findFirst({
        where: { requestId: { startsWith: prefix } },
        orderBy: { requestId: 'desc' }
    });
    const nextSerial = last ? parseInt(last.requestId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${nextSerial.toString().padStart(3, '0')}`;
}

export async function getAllIngredients(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { category, search, lowStockOnly } = opts;

        const where = {};
        if (category) where.category = category;
        if (search) where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { ingredientId: { contains: search, mode: 'insensitive' } }
        ];

        let ingredients = await prisma.ingredient.findMany({
            where,
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        });

        if (lowStockOnly) {
            ingredients = ingredients.filter(i => i.currentStock <= i.minStock);
        }

        return ingredients;
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to get ingredients', error);
        throw error;
    }
}

export async function upsertIngredient({ ingredientId, name, unit, currentStock, minStock, category, costPerUnit }) {
    try {
        const prisma = await getPrisma();
        return prisma.ingredient.upsert({
            where: { ingredientId },
            update: { name, unit, currentStock, minStock, category, costPerUnit },
            create: { ingredientId, name, unit, currentStock: currentStock ?? 0, minStock: minStock ?? 0, category: category ?? 'OTHER', costPerUnit }
        });
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to upsert ingredient', error);
        throw error;
    }
}

export async function updateStock(ingredientId, newStock) {
    try {
        const prisma = await getPrisma();
        const ingredient = await prisma.ingredient.update({
            where: { ingredientId },
            data: { currentStock: newStock }
        });
        logger.info('[KitchenRepo]', `Stock updated: ${ingredientId} → ${newStock} ${ingredient.unit}`);
        return ingredient;
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to update stock', error);
        throw error;
    }
}

export async function getBOMForProduct(productId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseBOM.findMany({
            where: { productId },
            include: { ingredient: true }
        });
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to get BOM', error);
        throw error;
    }
}

export async function upsertBOM({ productId, ingredientId, qtyPerPerson, unit }) {
    try {
        const prisma = await getPrisma();
        return prisma.courseBOM.upsert({
            where: { productId_ingredientId: { productId, ingredientId } },
            update: { qtyPerPerson, unit },
            create: { productId, ingredientId, qtyPerPerson, unit }
        });
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to upsert BOM', error);
        throw error;
    }
}

export async function calculateStockNeeded(scheduleId) {
    try {
        const prisma = await getPrisma();
        const schedule = await prisma.courseSchedule.findUnique({
            where: { id: scheduleId },
            include: { product: true }
        });
        if (!schedule) throw new Error(`Schedule not found: ${scheduleId}`);

        const bom = await getBOMForProduct(schedule.productId);
        const studentCount = schedule.confirmedStudents || schedule.maxStudents || 1;

        return bom.map(item => {
            const qtyNeeded = item.qtyPerPerson * studentCount;
            const qtyInStock = item.ingredient.currentStock;
            const qtyToBuy = Math.max(0, qtyNeeded - qtyInStock);
            return {
                ingredient: item.ingredient,
                unit: item.unit,
                qtyNeeded,
                qtyInStock,
                qtyToBuy,
                isSufficient: qtyInStock >= qtyNeeded
            };
        });
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to calculate stock needed', error);
        throw error;
    }
}

export async function createPurchaseRequest(scheduleId, notes) {
    try {
        const prisma = await getPrisma();
        const needs = await calculateStockNeeded(scheduleId);
        const itemsToBuy = needs.filter(n => n.qtyToBuy > 0);

        if (itemsToBuy.length === 0) return { alreadySufficient: true };

        const requestId = await generatePurchaseRequestId();

        return await prisma.$transaction(async (tx) => {
            const request = await tx.purchaseRequest.create({
                data: { requestId, scheduleId, notes, status: 'DRAFT' }
            });

            await tx.purchaseRequestItem.createMany({
                data: itemsToBuy.map(item => ({
                    purchaseRequestId: request.id,
                    ingredientId: item.ingredient.id,
                    qtyNeeded: item.qtyNeeded,
                    qtyInStock: item.qtyInStock,
                    qtyToBuy: item.qtyToBuy,
                    unit: item.unit,
                    estimatedCost: item.ingredient.costPerUnit
                        ? item.ingredient.costPerUnit * item.qtyToBuy
                        : null
                }))
            });

            return tx.purchaseRequest.findUnique({
                where: { id: request.id },
                include: { items: { include: { ingredient: true } } }
            });
        });
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to create purchase request', error);
        throw error;
    }
}

export async function getPurchaseRequests(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { status, limit = 50 } = opts;
        return prisma.purchaseRequest.findMany({
            where: status ? { status } : {},
            include: { items: { include: { ingredient: true } }, schedule: { include: { product: true } } },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        logger.error('[KitchenRepo]', 'Failed to get purchase requests', error);
        throw error;
    }
}
