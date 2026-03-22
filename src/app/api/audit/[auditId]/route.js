/**
 * POST /api/audit/[auditId]/approve  — approve a PENDING_APPROVAL entry
 * POST /api/audit/[auditId]/reject   — reject  a PENDING_APPROVAL entry
 * GET  /api/audit/[auditId]          — get single audit entry
 */
import { logger }        from '@/lib/logger';
import { NextResponse }   from 'next/server';
import { getPrisma }      from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions }    from '@/lib/authOptions';
import { approveAction, rejectAction } from '@/lib/repositories/auditRepo';

export async function GET(req, { params }) {
    try {
        const prisma = await getPrisma();
        const entry  = await prisma.auditLog.findUnique({ where: { auditId: params.auditId } });
        if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ data: entry });
    } catch (error) {
        logger.error('AuditAPI', 'GET [auditId] error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const session    = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const verb  = searchParams.get('action'); // 'approve' | 'reject'
        const body  = await req.json().catch(() => ({}));
        const note  = body.note ?? null;

        if (verb === 'approve') {
            const entry = await approveAction(params.auditId, session.user.id, note);
            return NextResponse.json({ success: true, data: entry });
        }

        if (verb === 'reject') {
            if (!note) return NextResponse.json({ error: 'note (reason) is required for rejection' }, { status: 400 });
            const entry = await rejectAction(params.auditId, session.user.id, note);
            return NextResponse.json({ success: true, data: entry });
        }

        return NextResponse.json({ error: 'action param must be approve or reject' }, { status: 400 });
    } catch (error) {
        logger.error('AuditAPI', 'POST [auditId] error', error);
        return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 });
    }
}
