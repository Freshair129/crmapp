import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { swapCourseInEnrollment } from '@/lib/repositories/packageRepo';

/**
 * POST /api/packages/[id]/swap
 * Body: { enrollmentId, oldProductId, newProductId }
 * [id] here = package enrollment UUID
 */
export async function POST(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { oldProductId, newProductId } = await request.json();
        if (!oldProductId || !newProductId) {
            return NextResponse.json({ error: 'oldProductId and newProductId are required' }, { status: 400 });
        }

        const updated = await swapCourseInEnrollment(params.id, oldProductId, newProductId);
        logger.info('[Packages]', `Swap performed on enrollment ${params.id}: ${oldProductId} → ${newProductId}`);
        return NextResponse.json(updated);
    } catch (error) {
        logger.error('[Packages]', 'Swap failed', error);
        const msg = error.message;
        if (msg === 'Swap already used for this enrollment') {
            return NextResponse.json({ error: msg }, { status: 409 });
        }
        if (msg === 'Package enrollment not found' || msg === 'Original course not found in enrollment') {
            return NextResponse.json({ error: msg }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
