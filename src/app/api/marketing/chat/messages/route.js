import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as inboxRepo from '@/lib/repositories/inboxRepo';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversation_id');

        if (!conversationId) {
            return NextResponse.json({ success: false, error: 'conversation_id required' }, { status: 400 });
        }

        const data = await inboxRepo.getMarketingChatMessages(conversationId);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('[chat/messages]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
