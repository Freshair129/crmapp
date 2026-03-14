import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const prisma = await getPrisma();
        const PAGE_ID = process.env.FB_PAGE_ID;

        const convs = await prisma.conversation.findMany({
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

        const data = convs.map(conv => {
            const latest = conv.messages[0];
            const customerName = conv.customer?.facebookName || 
                              (conv.customer?.firstName ? `${conv.customer.firstName} ${conv.customer.lastName || ''}`.trim() : null);
            
            return {
                id: conv.conversationId,
                conversation_id: conv.conversationId,
                participant_id: conv.participantId,
                participants: {
                    data: [
                        { id: conv.participantId, name: conv.participantName || customerName || 'Unknown' },
                    ],
                },
                snippet: latest?.content || '',
                updated_time: (conv.lastMessageAt || conv.updatedAt).toISOString(),
                unread_count: conv.unreadCount,
                isStarred: conv.isStarred,
                status: conv.status,
                agent: conv.assignedEmployee?.nickName || conv.assignedEmployee?.firstName || null,
                has_history: conv.messages.length > 0,
            };
        });

        return NextResponse.json({ success: true, data, pageId: PAGE_ID });
    } catch (error) {
        logger.error('[chat/conversations]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
