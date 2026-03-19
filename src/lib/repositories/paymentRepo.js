import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * Creates a PENDING transaction from an uploaded slip if valid and not duplicate.
 * 
 * @param {Object} params
 * @param {string} params.messageId
 * @param {string} params.conversationId
 * @param {string} params.imageUrl
 * @param {import('../slipParser').SlipResult} params.slipResult
 * @returns {Promise<import('@prisma/client').Transaction>}
 */
export async function createPendingFromSlip({ messageId, conversationId, imageUrl, slipResult }) {
    if (!slipResult.isSlip || slipResult.confidence < 0.8) {
        throw new Error('Invalid slip or confidence too low');
    }

    const prisma = await getPrisma();

    // Prevent duplicate refNumber (if we successfully extracted it)
    if (slipResult.refNumber) {
        const existing = await prisma.transaction.findFirst({
            where: {
                slipData: {
                    path: ['refNumber'],
                    equals: slipResult.refNumber
                }
            }
        });
        
        if (existing) {
            throw new Error(`Duplicate slip reference number: ${slipResult.refNumber}`);
        }
    }

    // Need an order to attach the transaction to.
    // As per instruction, we might create an Order automatically in verifyPayment.
    // However, the Prisma schema requires an orderId for Transaction immediately.
    // Workaround: We find an existing order, or create a 'pending' mock order
    // to anchor the transaction, then finalize it on verifyPayment.
    
    // NFR: All DB ops via paymentRepo. We use transaction if needed.
    const result = await prisma.$transaction(async (tx) => {
        let conversation = await tx.conversation.findUnique({
            where: { conversationId },
            select: { id: true, customerId: true }
        });

        if (!conversation || !conversation.customerId) {
            throw new Error(`Conversation not found or missing customer: ${conversationId}`);
        }

        // Find an open pending order, or create a placeholder order
        let order = await tx.order.findFirst({
            where: {
                customerId: conversation.customerId,
                status: 'PENDING'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!order) {
            order = await tx.order.create({
                data: {
                    orderId: crypto.randomUUID(),
                    customerId: conversation.customerId,
                    date: new Date(),
                    status: 'PENDING',
                    totalAmount: slipResult.amount || 0,
                    conversationId: conversation.id,
                }
            });
        }

        const transaction = await tx.transaction.create({
            data: {
                transactionId: `TX-${crypto.randomUUID().slice(-8).toUpperCase()}`,
                orderId: order.id,
                date: slipResult.date ? new Date(slipResult.date) : new Date(),
                amount: slipResult.amount || 0,
                type: 'INCOME',
                method: 'Transfer',
                chatMessageId: messageId,
                slipImageUrl: imageUrl,
                slipStatus: 'PENDING',
                slipData: {
                    ...slipResult
                }
            }
        });

        return transaction;
    });

    return result;
}

/**
 * Gets a list of pending slips for admin verification.
 * 
 * @param {number} limit 
 * @returns {Promise<import('@prisma/client').Transaction[]>}
 */
export async function getPendingSlips(limit = 50) {
    const prisma = await getPrisma();
    return prisma.transaction.findMany({
        where: { slipStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            order: {
                include: {
                    customer: true,
                    conversation: true
                }
            }
        }
    });
}

/**
 * Verifies a pending payment slip and marks the corresponding order as PAID.
 * 
 * @param {string} transactionId 
 * @param {string} employeeId 
 * @returns {Promise<import('@prisma/client').Transaction>}
 */
export async function verifyPayment(transactionId, employeeId) {
    const prisma = await getPrisma();

    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { order: true }
    });

    if (!transaction) throw new Error('Transaction not found');
    if (transaction.slipStatus === 'VERIFIED') throw new Error('Transaction already verified');

    const result = await prisma.$transaction(async (tx) => {
        // 1. Mark slip as VERIFIED
        const updatedTx = await tx.transaction.update({
            where: { id: transactionId },
            data: {
                slipStatus: 'VERIFIED',
                slipData: {
                    ...(transaction.slipData || {}),
                    verifiedBy: employeeId,
                    verifiedAt: new Date().toISOString()
                }
            }
        });

        // 2. Mark order as CLOSED/PAID and update paid amount
        if (transaction.order) {
            await tx.order.update({
                where: { id: transaction.order.id },
                data: {
                    status: 'CLOSED', // Standardized to CLOSED
                    paidAmount: { increment: transaction.amount },
                    closedById: employeeId,
                }
            });
        }

        return updatedTx;
    });

    return result;
}

/**
 * Aggregates monthly revenue with differentiation between Organic and Ads (First Touch).
 * 
 * @param {number} year 
 * @param {number} month 
 * @returns {Promise<{total: number, fromAds: number, organic: number}>}
 */
export async function getMonthlyRevenue(year, month) {
    const prisma = await getPrisma();

    // Construct date boundaries
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const verifiedTransactions = await prisma.transaction.findMany({
        where: {
            slipStatus: 'VERIFIED',
            date: {
                gte: startDate,
                lt: endDate
            }
        },
        include: {
            order: {
                include: {
                    conversation: true
                }
            }
        }
    });

    let fromAds = 0;
    let organic = 0;

    for (const tx of verifiedTransactions) {
        const amount = tx.amount || 0;
        const firstTouchAdId = tx.order?.conversation?.firstTouchAdId;
        
        if (firstTouchAdId) {
            fromAds += amount;
        } else {
            organic += amount;
        }
    }

    return {
        total: fromAds + organic,
        fromAds,
        organic
    };
}
