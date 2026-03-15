import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { createPurchaseRequest, getPurchaseRequests } from '@/lib/repositories/kitchenRepo';

export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const data = await getPurchaseRequests({
            status: searchParams.get('status'),
            limit: 100
        });
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[PurchaseRequest]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { scheduleId, notes } = await request.json();
        if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });

        const result = await createPurchaseRequest(scheduleId, notes);
        if (result.alreadySufficient) {
            return NextResponse.json({ message: 'Stock sufficient, no purchase needed' });
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error('[PurchaseRequest]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
