import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const prisma = await getPrisma();
        // 1. Fetch all ingredients that have a market url or recent market prices
        const ingredients = await prisma.ingredient.findMany({
            where: {
                OR: [
                    { marketUrl: { not: null } },
                    { marketPrices: { some: {} } }
                ]
            },
            include: {
                marketPrices: {
                    orderBy: { scrapedAt: 'desc' },
                    take: 10 // Get the last 10 tracked prices for the trend graph
                }
            },
            orderBy: { name: 'asc' }
        });

        // Add standard mapped responses 
        const data = ingredients.map(ing => {
            const currentPrice = ing.marketPrices[0]?.price || 0;
            const previousPrice = ing.marketPrices[1]?.price || currentPrice;
            const trend = currentPrice - previousPrice;
            const differenceToInternalCost = ing.costPerUnit ? (currentPrice - ing.costPerUnit) : 0;
            const percentageDiff = ing.costPerUnit ? (differenceToInternalCost / ing.costPerUnit) * 100 : 0;

            return {
                id: ing.id,
                name: ing.name,
                category: ing.category,
                internalCost: ing.costPerUnit || 0,
                unit: ing.unit,
                marketUrl: ing.marketUrl,
                source: ing.marketPrices[0]?.source || 'None',
                currentMarketPrice: currentPrice,
                trendRaw: trend,
                priceDiffToCost: differenceToInternalCost,
                priceDiffPercent: percentageDiff,
                history: [...ing.marketPrices].reverse().map(mp => ({
                    date: mp.scrapedAt.toISOString().split('T')[0],
                    price: mp.price
                }))
            };
        });

        return NextResponse.json(data);
    } catch (error) {
        logger.error('MarketPriceAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const { ingredientId, marketUrl } = await request.json();
        
        if (!ingredientId) {
             return NextResponse.json({ error: 'ingredientId is required' }, { status: 400 });
        }

        const prisma = await getPrisma();
        const updated = await prisma.ingredient.update({
            where: { id: ingredientId },
            data: { marketUrl: marketUrl || null }
        });

        return NextResponse.json(updated);
    } catch (error) {
        logger.error('MarketPriceAPI', 'PATCH error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
