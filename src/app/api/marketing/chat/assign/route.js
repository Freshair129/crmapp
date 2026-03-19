import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as inboxRepo from '@/lib/repositories/inboxRepo';

export async function POST(request) {
    try {
        const { conversationId, agentName } = await request.json();

        if (!conversationId || !agentName) {
            return NextResponse.json({ success: false, error: 'conversationId and agentName are required' }, { status: 400 });
        }

        await inboxRepo.upsertConversationByExternalId(conversationId, { assignedAgent: agentName });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[ChatAssign]', 'Assign failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
