import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const prisma = await getPrisma();

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                name: body.name,
                price: body.price,
                category: body.category,
                description: body.description,
                image: body.image,
                duration: body.duration,
                isActive: body.isActive,
            }
        });

        return NextResponse.json(updatedProduct);
    } catch (error) {
        logger.error('[ProductsId]', 'PUT error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();

        await prisma.product.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[ProductsId]', 'DELETE error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
