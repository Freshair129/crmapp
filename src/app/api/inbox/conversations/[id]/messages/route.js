import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getPrisma } from '@/lib/db';
import * as inboxRepo from '@/lib/repositories/inboxRepo';
import { pushMessage } from '@/lib/lineService';

const FB_GRAPH = 'https://graph.facebook.com/v19.0';

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
        const { text, responderId } = body;

        if (!text?.trim()) {
            return NextResponse.json({ error: 'text is required' }, { status: 400 });
        }

        // 1. Get conversation to find channel + participantId (PSID / LINE user ID)
        const prisma = await getPrisma();
        const conv = await prisma.conversation.findUnique({
            where: { id: params.id },
            select: { participantId: true, channel: true }
        });

        if (!conv) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const channel = (conv.channel || 'facebook').toLowerCase();
        let fbMessageId = null;

        // 2a. Send via Facebook Graph API
        if (channel === 'facebook') {
            if (!conv.participantId) {
                logger.warn('[InboxMessages]', `Conv ${params.id} has no participantId — cannot send to FB`);
            } else if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_ACCESS_TOKEN) {
                logger.warn('[InboxMessages]', 'FB credentials not configured');
            } else {
                const fbRes = await fetch(
                    `${FB_GRAPH}/${process.env.FB_PAGE_ID}/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipient: { id: conv.participantId },
                            message: { text },
                            messaging_type: 'RESPONSE'
                        })
                    }
                );
                const fbData = await fbRes.json();
                if (!fbRes.ok || fbData.error) {
                    const errMsg = fbData.error?.message || `FB API ${fbRes.status}`;
                    logger.error('[InboxMessages]', 'FB send failed', errMsg);
                    return NextResponse.json({ error: errMsg }, { status: 502 });
                }
                fbMessageId = fbData.message_id || null;
                logger.info('[InboxMessages]', `FB sent ok → mid=${fbMessageId}`);
            }
        }

        // 2b. Send via LINE push
        if (channel === 'line') {
            if (!conv.participantId) {
                logger.warn('[InboxMessages]', `Conv ${params.id} has no participantId — cannot send to LINE`);
            } else {
                await pushMessage(conv.participantId, [{ type: 'text', text }]);
                logger.info('[InboxMessages]', `LINE sent ok to ${conv.participantId}`);
            }
        }

        // 3. Save to DB — use FB message_id if available so webhook echo won't duplicate
        const message = await inboxRepo.postReply(params.id, {
            text,
            responderId,
            fbMessageId
        });

        return NextResponse.json(message);
    } catch (error) {
        logger.error('[InboxMessages]', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
