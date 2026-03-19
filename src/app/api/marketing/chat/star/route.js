import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as inboxRepo from '@/lib/repositories/inboxRepo';

export async function POST(request) {
    try {
        const { conversationId, isStarred } = await request.json();

        if (!conversationId || typeof isStarred !== 'boolean') {
            return NextResponse.json({ success: false, error: 'conversationId and isStarred (boolean) are required' }, { status: 400 });
        }

        await inboxRepo.upsertConversationByExternalId(conversationId, { isStarred });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[ChatStar]', 'Star update failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
