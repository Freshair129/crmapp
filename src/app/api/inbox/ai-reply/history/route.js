import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAIAssistHistory } from '@/lib/repositories/aiAssistLogRepo';

/**
 * GET /api/inbox/ai-reply/history?conversationId=t_xxx&limit=20
 * Returns AI assist log history for a given conversation thread
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

        if (!conversationId) {
            return NextResponse.json({ success: false, error: 'conversationId is required' }, { status: 400 });
        }

        const logs = await getAIAssistHistory(conversationId, limit);
        return NextResponse.json({ success: true, logs });

    } catch (err) {
        logger.error('[AIReplyHistory]', 'GET error', err);
        return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
    }
}
