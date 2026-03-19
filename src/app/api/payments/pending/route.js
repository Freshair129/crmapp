import { NextResponse } from 'next/server';
import { getPendingSlips } from '@/lib/repositories/paymentRepo';
import { logger } from '@/lib/logger';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        const pendingSlips = await getPendingSlips(limit);
        return NextResponse.json(pendingSlips);
    } catch (error) {
        logger.error('PaymentsAPI', 'GET /api/payments/pending failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
