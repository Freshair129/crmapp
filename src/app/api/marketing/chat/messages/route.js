import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversation_id');

        if (!conversationId) {
            return NextResponse.json({ success: false, error: 'conversation_id required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        const conv = await prisma.conversation.findUnique({
            where: { conversationId },
            select: { id: true },
        });

        if (!conv) {
            return NextResponse.json({ success: true, data: [] });
        }

        const messages = await prisma.message.findMany({
            where: { conversationId: conv.id },
            orderBy: { createdAt: 'asc' },
            select: {
                messageId: true,
                fromId: true,
                fromName: true,
                content: true,
                hasAttachment: true,
                attachmentType: true,
                attachmentUrl: true,
                metadata: true,
                createdAt: true,
            },
        });

        const data = messages.map(msg => ({
            id: msg.messageId,
            from: { id: msg.fromId, name: msg.fromName },
            message: msg.content,
            created_time: msg.createdAt.toISOString(),
            metadata: msg.metadata,
            attachments: msg.hasAttachment && msg.attachmentUrl
                ? { data: [{ type: msg.attachmentType, url: msg.attachmentUrl }] }
                : null,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('[chat/messages]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
