import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Get paginated conversations with enrichment.
 * @param {object} params
 * @param {string} [params.channel]
 * @param {string} [params.status]
 * @param {string} [params.search]
 * @param {number} [params.limit=10]
 * @param {number} [params.page=1]
 */
export async function getConversations({ channel, status, search, limit = 10, page = 1 }) {
    try {
        const prisma = await getPrisma();
        const skip = (page - 1) * limit;

        const where = {
            ...(channel && channel !== 'ALL' ? { channel: { equals: channel.toLowerCase(), mode: 'insensitive' } } : {}),
            ...(status ? { status: { equals: status.toLowerCase(), mode: 'insensitive' } } : {}),
            ...(search ? {
                OR: [
                    { participantName: { contains: search, mode: 'insensitive' } },
                    { customer: { firstName: { contains: search, mode: 'insensitive' } } },
                    { customer: { lastName: { contains: search, mode: 'insensitive' } } }
                ]
            } : {})
        };

        const conversations = await prisma.conversation.findMany({
            where,
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

        const formatted = conversations.map(c => ({
            id: c.id,
            conversationId: c.conversationId,
            channel: (c.channel || 'facebook').toUpperCase(),
            status: c.status,
            updatedAt: c.updatedAt,
            customer: c.customer ? {
                customerId: c.customer.customerId,
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

        return formatted;
    } catch (error) {
        logger.error('[InboxRepo]', 'getConversations error', error);
        throw error;
    }
}

/**
 * Get paginated messages for a conversation.
 * @param {string} conversationId 
 * @param {object} params
 * @param {number} [params.limit=20]
 * @param {number} [params.page=1]
 */
export async function getConversationMessages(conversationId, { limit = 20, page = 1 }) {
    try {
        const prisma = await getPrisma();
        const skip = (page - 1) * limit;

        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit + 1 // Take one extra to check for hasMore
        });

        const hasMore = messages.length > limit;
        const pageMessages = hasMore ? messages.slice(0, limit) : messages;

        // Sort back to chronological for the frontend and format
        const formatted = pageMessages.reverse().map(m => ({
            id: m.id,
            messageId: m.messageId,
            text: m.content || '(Media or Empty Content)',
            senderId: m.fromId,
            senderType: m.responderId ? 'AGENT' : 'CUSTOMER',
            createdAt: m.createdAt
        }));

        return { messages: formatted, hasMore };
    } catch (error) {
        logger.error('[InboxRepo]', 'getConversationMessages error', error);
        throw error;
    }
}

/**
 * Post a reply message.
 * @param {string} conversationId 
 * @param {object} params
 */
export async function postReply(conversationId, { text, responderId }) {
    try {
        const prisma = await getPrisma();
        const messageId = `m_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
        
        return await prisma.$transaction(async (tx) => {
            const message = await tx.message.create({
                data: {
                    messageId,
                    conversationId,
                    content: text,
                    responderId,
                    fromId: 'system', // Consistent with current route
                    createdAt: new Date(),
                    metadata: { source: 'unified-inbox' }
                }
            });

            await tx.conversation.update({
                where: { id: conversationId },
                data: { 
                    updatedAt: new Date(),
                    lastMessageAt: new Date()
                }
            });

            return {
                id: message.id,
                messageId: message.messageId,
                text: message.content,
                senderId: message.fromId,
                senderType: 'AGENT',
                createdAt: message.createdAt
            };
        });
    } catch (error) {
        logger.error('[InboxRepo]', 'postReply error', error);
        throw error;
    }
}
