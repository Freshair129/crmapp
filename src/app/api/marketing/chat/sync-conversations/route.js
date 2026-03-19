/**
 * GET /api/marketing/chat/sync-conversations?days=3
 *
 * Pulls recent Facebook Page conversations and messages via Graph API
 * and upserts them into the DB — works on localhost (no webhook needed).
 *
 * Use this to backfill conversations when the webhook is offline
 * (e.g., local dev, Vercel cold start, or token rotation).
 *
 * Added: Phase 28 fix — chat sync stopped after 2026-03-14 because
 * the real-time webhook requires a public URL. This endpoint is the
 * fallback poller.
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';

const GRAPH = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

async function graphGet(path, params = {}) {
    const url = new URL(`${GRAPH}${path}`);
    url.searchParams.set('access_token', PAGE_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString());
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Graph API ${res.status}`);
    }
    return res.json();
}

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!PAGE_ID || !PAGE_TOKEN) {
            return NextResponse.json({ error: 'FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not configured' }, { status: 503 });
        }

        const { searchParams } = new URL(request.url);
        const days = Math.min(parseInt(searchParams.get('days') || '3', 10), 30);
        const since = Math.floor((Date.now() - days * 86400000) / 1000);

        let upsertedConversations = 0;
        let upsertedMessages = 0;
        let cursor = null;

        const prisma = await getPrisma();

        // Fetch conversations page by page (max 3 pages to avoid timeout)
        for (let page = 0; page < 3; page++) {
            const params = {
                fields: 'participants,updated_time,unread_count',
                since: String(since),
                limit: '25',
            };
            if (cursor) params.after = cursor;

            const convData = await graphGet(`/${PAGE_ID}/conversations`, params);
            const conversations = convData.data || [];
            if (conversations.length === 0) break;

            for (const conv of conversations) {
                // Find the customer participant (not the page)
                const participants = conv.participants?.data || [];
                const customerParticipant = participants.find(p => p.id !== PAGE_ID);
                if (!customerParticipant) continue;

                const customerPsid = customerParticipant.id;
                const threadId = `t_${customerPsid}`;

                // Fetch messages for this conversation
                let messages = [];
                try {
                    const msgData = await graphGet(`/${conv.id}/messages`, {
                        fields: 'id,message,from,created_time,attachments',
                        limit: '20',
                    });
                    messages = msgData.data || [];
                } catch (err) {
                    logger.warn('[ChatSync]', `Failed to fetch messages for conv ${conv.id}`, err);
                }

                // Upsert customer
                let customer = await prisma.customer.findFirst({
                    where: { facebookId: customerPsid },
                    select: { id: true },
                });

                if (!customer) {
                    const { randomUUID } = await import('crypto');
                    const customerId = `TVS-CUS-FB-26-${randomUUID().slice(-4).toUpperCase()}`;
                    try {
                        customer = await prisma.customer.create({
                            data: {
                                customerId,
                                status: 'Active',
                                membershipTier: 'MEMBER',
                                lifecycleStage: 'Lead',
                                facebookId: customerPsid,
                                firstName: customerParticipant.name?.split(' ')[0] || null,
                                lastName: customerParticipant.name?.split(' ').slice(1).join(' ') || null,
                                facebookName: customerParticipant.name || null,
                                joinDate: new Date(),
                            },
                            select: { id: true },
                        });
                    } catch (err) {
                        if (err.code === 'P2002') {
                            customer = await prisma.customer.findFirst({
                                where: { facebookId: customerPsid },
                                select: { id: true },
                            });
                        } else throw err;
                    }
                }

                if (!customer) continue;

                // Upsert conversation
                const lastMsgAt = conv.updated_time ? new Date(conv.updated_time) : new Date();
                const dbConv = await prisma.conversation.upsert({
                    where: { conversationId: threadId },
                    create: {
                        conversationId: threadId,
                        customerId: customer.id,
                        channel: 'facebook',
                        participantId: customerPsid,
                        lastMessageAt: lastMsgAt,
                        unreadCount: conv.unread_count || 0,
                    },
                    update: {
                        lastMessageAt: lastMsgAt,
                    },
                    select: { id: true },
                });
                upsertedConversations++;

                // Upsert messages
                for (const msg of messages) {
                    if (!msg.id || !msg.message) continue;
                    const isFromPage = msg.from?.id === PAGE_ID;

                    try {
                        await prisma.message.upsert({
                            where: { messageId: msg.id },
                            create: {
                                messageId: msg.id,
                                conversationId: dbConv.id,
                                fromId: msg.from?.id || customerPsid,
                                fromName: isFromPage ? (msg.from?.name || 'Admin') : (customerParticipant.name || null),
                                content: msg.message || null,
                                hasAttachment: !!(msg.attachments?.data?.length),
                                createdAt: new Date(msg.created_time),
                                metadata: { source: 'graph_api_sync' },
                            },
                            update: {},
                        });
                        upsertedMessages++;
                    } catch (err) {
                        if (err.code !== 'P2002') {
                            logger.warn('[ChatSync]', `Failed to upsert message ${msg.id}`, err);
                        }
                    }
                }
            }

            cursor = convData.paging?.cursors?.after;
            if (!cursor || !convData.paging?.next) break;
        }

        logger.info('[ChatSync]', `Done: ${upsertedConversations} conversations, ${upsertedMessages} messages`);

        return NextResponse.json({
            success: true,
            syncedAt: new Date().toISOString(),
            stats: { conversations: upsertedConversations, messages: upsertedMessages, days },
        });
    } catch (error) {
        logger.error('[ChatSync]', 'sync-conversations failed', error);
        const isTokenExpired = error.message?.includes('190') || error.message?.toLowerCase().includes('token');
        return NextResponse.json({
            error: isTokenExpired ? 'FB Page Access Token หมดอายุ — ต้อง refresh token ใน .env' : error.message,
            code: isTokenExpired ? 'TOKEN_EXPIRED' : 'INTERNAL_ERROR',
        }, { status: isTokenExpired ? 401 : 500 });
    }
}
