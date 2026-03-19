import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations
 *
 * Standard use: ?channel=&agent=  → returns array (legacy)
 *
 * DB-mode for sync_agents_v5.js:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=N
 *   → returns { conversations: [...], total: N }
 *   Each item has: id, conversationId (t_XXX), participantId (PSID),
 *                  participantName, status, lastMessageAt
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);

        const from  = searchParams.get('from');
        const to    = searchParams.get('to');

        // ── DB-mode (sync_agents_v5 --mode=db) ────────────────────────────────
        if (from && to) {
            const limit = Math.min(parseInt(searchParams.get('limit') || '9999'), 9999);
            const fromDate = new Date(from);
            const toDate   = new Date(to);
            toDate.setHours(23, 59, 59, 999);

            if (isNaN(fromDate) || isNaN(toDate)) {
                return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
            }

            // Conversations that had message activity in range
            const conversations = await prisma.conversation.findMany({
                where: {
                    channel: { equals: 'facebook', mode: 'insensitive' },
                    messages: { some: { createdAt: { gte: fromDate, lte: toDate } } }
                },
                select: {
                    id:              true,
                    conversationId:  true,
                    participantId:   true,
                    participantName: true,
                    status:          true,
                    lastMessageAt:   true,
                },
                orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
                take: limit,
            });

            logger.info('[ConversationAPI]', `DB mode: ${conversations.length} convs ${from} → ${to}`);
            return NextResponse.json({ conversations, total: conversations.length });
        }

        // ── Legacy mode ────────────────────────────────────────────────────────
        const channel       = searchParams.get('channel') || undefined;
        const assignedAgent = searchParams.get('agent')   || undefined;

        const conversations = await prisma.conversation.findMany({
            where: {
                AND: [
                    channel       ? { channel }       : {},
                    assignedAgent ? { assignedAgent } : {}
                ]
            },
            include: {
                customer: {
                    select: { firstName: true, lastName: true, nickName: true, customerId: true }
                }
            },
            orderBy: { lastMessageAt: 'desc' },
            take: 50
        });

        return NextResponse.json(conversations);
    } catch (error) {
        logger.error('[ConversationAPI]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
