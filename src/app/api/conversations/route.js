import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/conversations - List conversations
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);

        const channel = searchParams.get('channel') || undefined;
        const assignedAgent = searchParams.get('agent') || undefined;

        const conversations = await prisma.conversation.findMany({
            where: {
                AND: [
                    channel ? { channel } : {},
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
        logger.error('ConversationAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
