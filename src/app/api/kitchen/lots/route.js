import { NextResponse } from 'next/server';
import { getAllLots, createLot, getExpiringLots } from '@/lib/repositories/kitchenRepo';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kitchen/lots?status=ACTIVE&ingredientId=xxx&expiring=30
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const ingredientId = searchParams.get('ingredientId') || undefined;
        const expiring = searchParams.get('expiring');

        if (expiring) {
            const daysAhead = parseInt(expiring, 10) || 30;
            const lots = await getExpiringLots(daysAhead);
            return NextResponse.json({ success: true, data: lots });
        }

        const lots = await getAllLots({ status, ingredientId });
        return NextResponse.json({ success: true, data: lots });
    } catch (error) {
        logger.error('[LotAPI]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/kitchen/lots
 * Body: { ingredientId, receivedQty, unit, expiresAt?, costPerUnit?, supplier?, purchaseRequestId?, notes? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { ingredientId, receivedQty, unit } = body;
        if (!ingredientId || !receivedQty || !unit) {
            return NextResponse.json({ success: false, error: 'ingredientId, receivedQty, and unit are required' }, { status: 400 });
        }
        const lot = await createLot(body);
        return NextResponse.json({ success: true, data: lot }, { status: 201 });
    } catch (error) {
        logger.error('[LotAPI]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
