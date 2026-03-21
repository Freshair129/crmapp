import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as inboxRepo from '@/lib/repositories/inboxRepo';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const channel = searchParams.get('channel') || 'ALL';
        const status = searchParams.get('status') || 'open';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search');
        const customerId = searchParams.get('customerId') || undefined;

        logger.info('[InboxConversations]', `Fetching conversations: channel=${channel}, status=${status}, search=${search}, page=${page}, customerId=${customerId}`);

        const formatted = await inboxRepo.getConversations({ channel, status, search, customerId, limit, page });

        logger.info('[InboxConversations]', `Found ${formatted.length} conversations`);

        return NextResponse.json(formatted);
    } catch (error) {
        logger.error('[InboxConversations]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
