import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const prisma = await getPrisma();

        // Fetch existing product to merge metadata
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Build update data — only include fields that are explicitly sent
        const updateData = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.price !== undefined) updateData.price = body.price;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.image !== undefined) updateData.image = body.image;
        if (body.duration !== undefined) updateData.duration = body.duration;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.hours !== undefined) updateData.hours = body.hours;
        if (body.days !== undefined) updateData.days = body.days;
        if (body.sessionType !== undefined) updateData.sessionType = body.sessionType;
        if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
        // ── equipment / food spec fields ──
        if (body.brand         !== undefined) updateData.brand         = body.brand;
        if (body.size          !== undefined) updateData.size          = body.size;
        if (body.dimension     !== undefined) updateData.dimension     = body.dimension;
        if (body.unitAmount    !== undefined) updateData.unitAmount    = body.unitAmount;
        if (body.unitType      !== undefined) updateData.unitType      = body.unitType;
        if (body.originCountry !== undefined) updateData.originCountry = body.originCountry;

        // Merge metadata (preserve existing keys, allow images update)
        if (body.metadata !== undefined) {
            const existingMeta = existing.metadata || {};
            updateData.metadata = { ...existingMeta, ...body.metadata };

            // Enforce max 6 images (1 main + 5 extras)
            if (Array.isArray(updateData.metadata.images)) {
                updateData.metadata.images = updateData.metadata.images.slice(0, 5);
            }
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: updateData
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
