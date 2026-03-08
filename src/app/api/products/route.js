import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/products - List products (courses)
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || undefined;

        const products = await prisma.product.findMany({
            where: {
                AND: [
                    { isActive: true },
                    category ? { category } : {}
                ]
            },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(products);
    } catch (error) {
        logger.error('ProductAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
