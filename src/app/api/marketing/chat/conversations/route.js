import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const prisma = await getPrisma();
        const PAGE_ID = process.env.FB_PAGE_ID;

        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const cursor = searchParams.get('cursor'); // conversation UUID

        const convs = await prisma.conversation.findMany({
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { lastMessageAt: 'desc' },
            include: {
                assignedEmployee: { select: { firstName: true, nickName: true } },
                customer: { select: { firstName: true, lastName: true, facebookName: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { content: true, createdAt: true },
                },
            },
        });

        const hasMore = convs.length > limit;
        const rows = hasMore ? convs.slice(0, limit) : convs;
        const nextCursor = hasMore ? rows[rows.length - 1].id : null;

        const data = rows.map(conv => {
            const lastMsg = conv.messages?.[0];
            const snippet = lastMsg?.content?.slice(0, 80) ?? '';
            
            const displayName = conv.customer
                ? (conv.customer.facebookName || conv.customer.firstName || 'Unknown')
                : (conv.participantId || 'Unknown');
            
            return {
                id: conv.conversationId,
                conversation_id: conv.conversationId,
                participant_id: conv.participantId,
                participants: {
                    data: [
                        { id: conv.participantId, name: displayName },
                    ],
                },
                snippet: snippet,
                updated_time: (conv.lastMessageAt || conv.updatedAt).toISOString(),
                unread_count: conv.unreadCount,
                isStarred: conv.isStarred,
                status: conv.status,
                agent: conv.assignedEmployee?.nickName || conv.assignedEmployee?.firstName || null,
                has_history: !!lastMsg,
            };
        });

        return NextResponse.json({ success: true, data, nextCursor, hasMore, pageId: PAGE_ID });
    } catch (error) {
        logger.error('[chat/conversations]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
