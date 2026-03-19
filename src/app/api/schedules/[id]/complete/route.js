import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { completeSessionWithStockDeduction } from '@/lib/repositories/scheduleRepo';

/**
 * POST /api/schedules/[id]/complete
 * Body: { studentCount: number }
 * Marks session as COMPLETED and deducts ingredient + equipment stock in a transaction.
 */
export async function POST(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const studentCount = body.studentCount;

        const result = await completeSessionWithStockDeduction(params.id, studentCount);
        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Schedules]', 'Complete failed', error);
        const msg = error.message;
        if (msg === 'Schedule not found') return NextResponse.json({ error: msg }, { status: 404 });
        if (msg === 'Session already completed' || msg === 'Cannot complete a cancelled session') {
            return NextResponse.json({ error: msg }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
