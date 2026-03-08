import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

/**
 * POST /api/marketing/sync-incremental
 * Triggers an incremental sync (last 24h) — enqueues background job via redirect to sync?months=0
 */
export async function POST() {
    try {
        // Fire-and-forget: call sync with 1-day window in background
        const baseUrl = process.env.CRM_BASE_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/marketing/sync?months=0`).catch((err) => {
            logger.error('[SyncIncremental]', 'Background sync failed', err);
        });

        return NextResponse.json({
            success: true,
            message: 'Incremental sync started',
        });
    } catch (error) {
        logger.error('[SyncIncremental]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
