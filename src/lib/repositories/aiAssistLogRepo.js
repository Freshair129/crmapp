import { getPrisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * aiAssistLogRepo — stores AI-generated reply history per conversation thread
 *
 * conversationId = the thread identifier (e.g. t_12345 from Facebook, or LINE thread id)
 * inboxId        = the UUID primary key in the conversations table (nullable for compatibility)
 */

/** Save a generated reply to history */
export async function createAIAssistLog({ conversationId, inboxId, input, tone, reply, customerName }) {
    try {
        const prisma = await getPrisma();
        return await prisma.aIAssistLog.create({
            data: { conversationId, inboxId, input, tone, reply, customerName },
            select: { id: true, conversationId: true, createdAt: true },
        });
    } catch (err) {
        // Non-fatal — log but don't throw so reply still returns to user
        logger.error('[aiAssistLogRepo]', 'createAIAssistLog failed', err);
        return null;
    }
}

/** Get AI assist history for a conversation thread (newest first) */
export async function getAIAssistHistory(conversationId, limit = 20) {
    try {
        const prisma = await getPrisma();
        return await prisma.aIAssistLog.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { id: true, input: true, tone: true, reply: true, customerName: true, createdAt: true },
        });
    } catch (err) {
        logger.error('[aiAssistLogRepo]', 'getAIAssistHistory failed', err);
        return [];
    }
}
