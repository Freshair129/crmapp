import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/inbox/sync-messages/[syncId]
 * Get status of a specific sync session
 */
export async function GET(request, { params }) {
    try {
        const prisma = await getPrisma();
        const rows = await prisma.$queryRaw`
            SELECT * FROM message_sync_sessions WHERE id = ${params.syncId}
        `;
        if (!rows.length) {
            return NextResponse.json({ error: 'Sync session not found' }, { status: 404 });
        }
        return NextResponse.json({ session: rows[0] });
    } catch (error) {
        logger.error('[SyncMessages GET/:id]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/inbox/sync-messages/[syncId]/replay (handled via route)
 * Actually just call POST /api/inbox/sync-messages with same from/to
 * This endpoint fetches the original params and re-runs
 */
export async function POST(request, { params }) {
    try {
        const prisma = await getPrisma();
        const rows = await prisma.$queryRaw`
            SELECT * FROM message_sync_sessions WHERE id = ${params.syncId}
        `;
        if (!rows.length) {
            return NextResponse.json({ error: 'Sync session not found' }, { status: 404 });
        }

        const original = rows[0];
        const fromStr = original.metadata?.fromStr || original.from_date?.toISOString().slice(0, 10);
        const toStr = original.metadata?.toStr || original.to_date?.toISOString().slice(0, 10);

        // Forward to main POST handler
        const replayRes = await fetch(new URL('/api/inbox/sync-messages', request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromStr, to: toStr })
        });

        const data = await replayRes.json();
        return NextResponse.json({ replaying: params.syncId, ...data });
    } catch (error) {
        logger.error('[SyncMessages replay]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
