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
        logger.info('[InboxConversations]', `Fetching conversations: channel=${channel}, status=${status}, search=${search}, skip=${skip}`);

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
                        lastName: true,
                        phonePrimary: true,
                        facebookId: true,
                        originId: true,
                        membershipTier: true,
                        lifecycleStage: true,
                        intelligence: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        content: true,
                        createdAt: true,
                        fromId: true,
                        fromName: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit
        });

        logger.info('[InboxConversations]', `Found ${conversations.length} conversations`);

        const formatted = conversations.map(c => ({
            id: c.id,
            conversationId: c.conversationId,
            channel: (c.channel || 'facebook').toUpperCase(),
            status: c.status,
            updatedAt: c.updatedAt,
            customer: c.customer ? {
                customerId: c.customer.customerId,
                // Fallback chain: firstName → participantName → fromName in last msg → FB ID suffix
                firstName: c.customer.firstName
                    || c.participantName
                    || c.messages[0]?.fromName
                    || (c.customer.facebookId ? `FB-${c.customer.facebookId.slice(-6)}` : 'ผู้ใช้ Facebook'),
                lastName: c.customer.lastName || '',
                channel: (c.channel || 'facebook').toUpperCase(),
                phonePrimary: c.customer.phonePrimary,
                facebookId: c.customer.facebookId,
                originId: c.customer.originId,
                membershipTier: c.customer.membershipTier,
                lifecycleStage: c.customer.lifecycleStage,
                intelligence: c.customer.intelligence
            } : {
                customerId: null,
                firstName: c.participantName
                    || c.messages[0]?.fromName
                    || (c.participantId ? `FB-${c.participantId.slice(-6)}` : 'ผู้ใช้ Facebook'),
                lastName: '',
                channel: (c.channel || 'facebook').toUpperCase(),
                phonePrimary: null,
                facebookId: c.participantId,
                originId: null,
                membershipTier: null,
                lifecycleStage: null,
                intelligence: null
            },
            lastMessage: c.messages[0] ? {
                text: c.messages[0].content || '(Message)',
                createdAt: c.messages[0].createdAt,
                senderId: c.messages[0].fromId
            } : null
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        logger.error('[InboxConversations]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
