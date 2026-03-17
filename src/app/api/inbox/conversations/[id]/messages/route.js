import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as inboxRepo from '@/lib/repositories/inboxRepo';

export async function GET(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const { messages } = await inboxRepo.getConversationMessages(params.id, { page, limit });

        return NextResponse.json(messages);
    } catch (error) {
        logger.error('[InboxMessages]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const body = await request.json();
        // responderId is typically current user, but route was hardcoding 'system' fromId
        // We'll pass responderId if provided in body, otherwise handled by repo
        const message = await inboxRepo.postReply(params.id, { 
            text: body.text, 
            responderId: body.responderId 
        });

        return NextResponse.json(message);
    } catch (error) {
        logger.error('[InboxMessages]', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
