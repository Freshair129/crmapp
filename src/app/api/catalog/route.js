import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const prisma = await getPrisma();

        const allProducts = await prisma.product.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        // Split into packages vs courses (same format as old catalog API)
        const packages = allProducts
            .filter(p => p.category === 'package' || p.productId?.startsWith('TVS-PKG'))
            .map(p => ({
                id: p.productId,
                name: p.name,
                price: p.price,
                category: p.category,
                description: p.description || '',
                image: p.image || null,
            }));

        const courses = allProducts
            .filter(p => p.category !== 'package' && !p.productId?.startsWith('TVS-PKG'))
            .map(p => ({
                id: p.productId,
                name: p.name,
                price: p.price,
                category: p.category,
                description: p.description || '',
                image: p.image || null,
            }));

        return NextResponse.json({ courses, packages });
    } catch (error) {
        console.error('[catalog] GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
