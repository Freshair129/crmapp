Loaded cached credentials.
```javascript
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

/**
 * POST /api/products - Create a new product
 */
export async function POST(request) {
    try {
        const prisma = await getPrisma();
        const body = await request.json();
        const { name, price, category, description, image, duration, productId } = body;

        const product = await prisma.product.create({
            data: {
                name,
                price: Number(price),
                category: category || 'course',
                description,
                image,
                duration: duration ? Number(duration) : null,
                productId: productId || crypto.randomUUID(),
                isActive: true
            }
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        logger.error('ProductAPI', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```
