import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getPrisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const prisma = await getPrisma();

        // 1. Products by category (pie chart)
        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { category: true, id: true }
        });
        const categoryCount = {};
        for (const p of products) {
            const cat = p.category || 'other';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        }
        const categoryPie = Object.entries(categoryCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 2. Low stock ingredients (top 5)
        const lowStockItems = await prisma.ingredient.findMany({
            where: {
                currentStock: { lte: prisma.raw ? undefined : 999999 }
            },
            orderBy: { currentStock: 'asc' },
            select: { id: true, name: true, currentStock: true, minStock: true, unit: true, category: true },
            take: 50
        });
        const lowStock = lowStockItems
            .filter(i => i.currentStock <= i.minStock)
            .slice(0, 5);

        // 3. Total product count
        const totalProducts = products.length;

        // 4. Incoming stock — purchase requests with status APPROVED (กำลังมาส่ง)
        const incomingPOs = await prisma.purchaseRequest.findMany({
            where: { status: 'APPROVED' },
            select: { id: true, requestId: true, status: true, createdAt: true, notes: true },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // 5. Lots arriving today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const arrivingToday = await prisma.ingredientLot.findMany({
            where: {
                receivedAt: { gte: todayStart, lte: todayEnd }
            },
            include: {
                ingredient: { select: { name: true, unit: true } }
            },
            orderBy: { receivedAt: 'desc' },
            take: 10
        });

        // 6. ABC Analysis — by cost value (currentStock × costPerUnit)
        const allIngredients = await prisma.ingredient.findMany({
            select: { id: true, name: true, currentStock: true, costPerUnit: true, unit: true, category: true }
        });
        const withValue = allIngredients
            .map(i => ({ ...i, totalValue: (i.currentStock || 0) * (i.costPerUnit || 0) }))
            .sort((a, b) => b.totalValue - a.totalValue);

        const grandTotal = withValue.reduce((sum, i) => sum + i.totalValue, 0);
        let cumulative = 0;
        const abcItems = withValue.map(i => {
            cumulative += i.totalValue;
            const pct = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
            const grade = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
            return { ...i, cumulativePct: pct, grade };
        });

        const abcSummary = {
            A: { count: abcItems.filter(i => i.grade === 'A').length, value: abcItems.filter(i => i.grade === 'A').reduce((s, i) => s + i.totalValue, 0) },
            B: { count: abcItems.filter(i => i.grade === 'B').length, value: abcItems.filter(i => i.grade === 'B').reduce((s, i) => s + i.totalValue, 0) },
            C: { count: abcItems.filter(i => i.grade === 'C').length, value: abcItems.filter(i => i.grade === 'C').reduce((s, i) => s + i.totalValue, 0) },
        };

        return NextResponse.json({
            totalProducts,
            categoryPie,
            lowStock,
            lowStockCount: lowStockItems.filter(i => i.currentStock <= i.minStock).length,
            incomingPOs,
            arrivingToday,
            abcSummary,
            abcTopA: abcItems.filter(i => i.grade === 'A').slice(0, 5),
            grandTotalValue: grandTotal
        });
    } catch (error) {
        logger.error('[DashboardInventory]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
