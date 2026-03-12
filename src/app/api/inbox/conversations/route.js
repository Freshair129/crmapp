import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const channel = searchParams.get('channel') || 'ALL';
        const status = searchParams.get('status') || 'open';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const search = searchParams.get('search');
        const prisma = await getPrisma();

        const conversations = await prisma.conversation.findMany({
            where: {
                ...(channel !== 'ALL' ? { channel: { equals: channel.toLowerCase(), mode: 'insensitive' } } : {}),
                ...(status ? { status: { equals: status.toLowerCase(), mode: 'insensitive' } } : {}),
                ...(search ? {
                    OR: [
                        { participantName: { contains: search, mode: 'insensitive' } },
                        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
                        { customer: { lastName: { contains: search, mode: 'insensitive' } } }
                    ]
                } : {})
            },
            include: {
                customer: {
                    select: {
                        customerId: true,
                        firstName: true,
                        lastName: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        content: true,
                        createdAt: true,
                        fromId: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit
        });

        const formatted = conversations.map(c => ({
            id: c.id,
            conversationId: c.conversationId,
            channel: c.channel.toUpperCase(),
            status: c.status,
            updatedAt: c.updatedAt,
            customer: c.customer ? {
                customerId: c.customer.customerId,
                firstName: c.customer.firstName,
                lastName: c.customer.lastName,
                channel: c.channel.toUpperCase()
            } : {
                customerId: null,
                firstName: c.participantName || 'Unknown',
                lastName: '',
                channel: c.channel.toUpperCase()
            },
            lastMessage: c.messages[0] ? {
                text: c.messages[0].content,
                createdAt: c.messages[0].createdAt,
                senderId: c.messages[0].fromId
            } : null
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        logger.error('[InboxConversations]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
