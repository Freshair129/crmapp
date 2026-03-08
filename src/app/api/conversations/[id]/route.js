import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/conversations/[id] - Get conversation detail + messages
 */
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                customer: true,
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50
                }
            }
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        return NextResponse.json(conversation);
    } catch (error) {
        logger.error('ConversationDetailAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/conversations/[id] - Update conversation (assign agent, star, etc.)
 */
export async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const prisma = await getPrisma();

        const updated = await prisma.conversation.update({
            where: { id },
            data: body
        });

        return NextResponse.json(updated);
    } catch (error) {
        logger.error('ConversationDetailAPI', 'PATCH error', error);
        return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }
}
