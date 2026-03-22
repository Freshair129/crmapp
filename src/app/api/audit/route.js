/**
 * GET /api/audit
 * Query audit logs with filters
 *
 * Query params:
 *   action, status, entity, actorId, limit, cursor
 */
import { logger }      from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getAuditLogs, getPendingApprovals } from '@/lib/repositories/auditRepo';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const pending = searchParams.get('pending') === 'true';
        if (pending) {
            const action = searchParams.get('action') ?? null;
            const limit  = parseInt(searchParams.get('limit') ?? '50', 10);
            const data   = await getPendingApprovals({ limit, action });
            return NextResponse.json({ data });
        }

        const data = await getAuditLogs({
            action:  searchParams.get('action')  ?? null,
            status:  searchParams.get('status')  ?? null,
            entity:  searchParams.get('entity')  ?? null,
            actorId: searchParams.get('actorId') ?? null,
            limit:   parseInt(searchParams.get('limit') ?? '50', 10),
            cursor:  searchParams.get('cursor')  ?? null,
        });

        return NextResponse.json({ data });
    } catch (error) {
        logger.error('AuditAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
