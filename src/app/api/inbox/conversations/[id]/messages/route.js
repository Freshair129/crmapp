import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getPrisma } from '@/lib/db';
import * as inboxRepo from '@/lib/repositories/inboxRepo';
import { pushMessage } from '@/lib/lineService';

const FB_GRAPH = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

/**
 * Lazy-fetch messages from FB Graph API for a given PSID.
 * Called when DB has no messages for a conversation (e.g. after sync-conversations without fetchMessages).
 * Returns count of messages saved.
 */
async function lazyFetchMessagesFromFB(convDbId, participantId, participantName) {
    try {
        // Step 1: find the FB conversation ID for this PSID
        const convLookupUrl = new URL(`${FB_GRAPH}/${PAGE_ID}/conversations`);
        convLookupUrl.searchParams.set('user_id', participantId);
        convLookupUrl.searchParams.set('fields', 'id');
        convLookupUrl.searchParams.set('access_token', PAGE_TOKEN);
        const convLookupRes = await fetch(convLookupUrl.toString());
        if (!convLookupRes.ok) return 0;
        const convLookupData = await convLookupRes.json();
        const fbConvId = convLookupData.data?.[0]?.id;
        if (!fbConvId) return 0;

        // Step 2: fetch messages for that conversation
        const msgUrl = new URL(`${FB_GRAPH}/${fbConvId}/messages`);
        msgUrl.searchParams.set('fields', 'id,message,from,created_time,attachments');
        msgUrl.searchParams.set('limit', '25');
        msgUrl.searchParams.set('access_token', PAGE_TOKEN);
        const msgRes = await fetch(msgUrl.toString());
        if (!msgRes.ok) return 0;
        const msgData = await msgRes.json();
        const messages = msgData.data || [];

        const prisma = await getPrisma();
        let saved = 0;
        for (const msg of messages) {
            if (!msg.id) continue;
            const isFromPage = msg.from?.id === PAGE_ID;
            try {
                await prisma.message.upsert({
                    where: { messageId: msg.id },
                    create: {
                        messageId: msg.id,
                        conversationId: convDbId,
                        fromId: msg.from?.id || participantId,
                        fromName: isFromPage ? (msg.from?.name || 'Admin') : (participantName || null),
                        content: msg.message || null,
                        hasAttachment: !!(msg.attachments?.data?.length),
                        attachmentType: msg.attachments?.data?.[0]?.type || null,
                        attachmentUrl: msg.attachments?.data?.[0]?.image_data?.url
                            || msg.attachments?.data?.[0]?.file_url || null,
                        createdAt: new Date(msg.created_time),
                        metadata: { source: 'lazy_fb_fetch', is_echo: isFromPage },
                    },
                    update: {},
                });
                saved++;
            } catch (e) {
                if (e.code !== 'P2002') logger.warn('[LazyFetch]', `skip msg ${msg.id}`, e.message);
            }
        }
        logger.info('[LazyFetch]', `Saved ${saved} messages for conv ${convDbId}`);
        return saved;
    } catch (err) {
        logger.warn('[LazyFetch]', 'Failed to lazy-fetch from FB', err.message);
        return 0;
    }
}

export async function GET(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const { messages } = await inboxRepo.getConversationMessages(params.id, { page, limit });

        // Lazy fetch: if DB has no messages on page 1, pull from FB Graph API
        if (messages.length === 0 && page === 1 && PAGE_ID && PAGE_TOKEN) {
            const prisma = await getPrisma();
            const conv = await prisma.conversation.findUnique({
                where: { id: params.id },
                select: { participantId: true, channel: true, participantName: true },
            });
            if (conv?.channel?.toLowerCase() === 'facebook' && conv.participantId) {
                const saved = await lazyFetchMessagesFromFB(params.id, conv.participantId, conv.participantName);
                if (saved > 0) {
                    // Re-query after saving
                    const { messages: freshMessages } = await inboxRepo.getConversationMessages(params.id, { page, limit });
                    return NextResponse.json(freshMessages);
                }
            }
        }

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
