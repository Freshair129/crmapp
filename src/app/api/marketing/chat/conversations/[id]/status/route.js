import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const VALID_STATUSES = ['open', 'pending', 'closed'];

/**
 * PATCH /api/marketing/chat/conversations/[id]/status
 * Body: { status: 'open' | 'pending' | 'closed' }
 * Updates conversation status and returns updated record.
 */
export async function PATCH(request, { params }) {
    const { id } = params;  // conversationId (e.g. t_10163799966326505)

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
        return NextResponse.json(
            { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const prisma = await getPrisma();

        const updated = await prisma.conversation.updateMany({
            where: { conversationId: id },
            data:  { status },
        });

        if (updated.count === 0) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        logger.info('ConvStatus', `${id} → ${status}`);
        return NextResponse.json({ success: true, conversationId: id, status });
    } catch (err) {
        logger.error('ConvStatus', 'Failed to update status', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
