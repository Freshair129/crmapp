import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function GET(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const prisma = await getPrisma();
        const messages = await prisma.message.findMany({
            where: { conversationId: params.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        // Sort back to chronological for the frontend
        messages.reverse();

        const formatted = messages.map(m => ({
            id: m.id,
            messageId: m.messageId,
            text: m.content || '(Media or Empty Content)',
            senderId: m.fromId,
            senderType: m.responderId ? 'AGENT' : 'CUSTOMER',
            createdAt: m.createdAt
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        logger.error('[InboxMessages]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const prisma = await getPrisma();

        const message = await prisma.message.create({
            data: {
                messageId: `m_${crypto.randomUUID()}`,
                conversationId: params.id,
                content: body.text,
                fromId: 'system',
                createdAt: new Date(),
                metadata: { source: 'unified-inbox' }
            }
        });

        // Update conversation's updatedAt and lastMessageAt
        await prisma.conversation.update({
            where: { id: params.id },
            data: { 
                updatedAt: new Date(),
                lastMessageAt: new Date()
            }
        });

        return NextResponse.json({
            id: message.id,
            messageId: message.messageId,
            text: message.content,
            senderId: message.fromId,
            senderType: 'AGENT',
            createdAt: message.createdAt
        });
    } catch (error) {
        logger.error('[InboxMessages]', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
