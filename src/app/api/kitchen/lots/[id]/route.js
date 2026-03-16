import { NextResponse } from 'next/server';
import { updateLotStatus, getLotsByIngredient } from '@/lib/repositories/kitchenRepo';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/kitchen/lots/[id] — get single lot by UUID or get lots by ingredientId
 */
export async function GET(request, { params }) {
    try {
        const prisma = await getPrisma();
        const lot = await prisma.ingredientLot.findUnique({
            where: { id: params.id },
            include: { ingredient: { select: { ingredientId: true, name: true, unit: true } } }
        });
        if (!lot) return NextResponse.json({ success: false, error: 'Lot not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: lot });
    } catch (error) {
        logger.error('[LotAPI]', 'GET [id] error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/kitchen/lots/[id]
 * Body: { status?, remainingQty?, notes? }
 */
export async function PATCH(request, { params }) {
    try {
        const prisma = await getPrisma();
        const body = await request.json();
        const { status, remainingQty, notes } = body;

        const VALID_STATUS = ['ACTIVE', 'CONSUMED', 'EXPIRED', 'RECALLED'];
        if (status && !VALID_STATUS.includes(status)) {
            return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUS.join(', ')}` }, { status: 400 });
        }

        const updated = await prisma.ingredientLot.update({
            where: { id: params.id },
            data: {
                ...(status !== undefined ? { status } : {}),
                ...(remainingQty !== undefined ? { remainingQty } : {}),
                ...(notes !== undefined ? { notes } : {})
            },
            include: { ingredient: { select: { name: true, unit: true } } }
        });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        logger.error('[LotAPI]', 'PATCH [id] error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
