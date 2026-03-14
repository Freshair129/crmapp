/**
 * LINE Webhook Endpoint
 * POST /api/webhooks/line
 *
 * ADR-016: LINE Messaging API Integration
 * ADR-025: Cross-Platform Identity Resolution
 *
 * Validates LINE signature → parses events → records conversions for ROAS attribution.
 * Must respond 200 OK within 200ms (LINE requirement) — heavy work is fire-and-forget.
 */

import { getPrisma } from '@/lib/db';

/**
 * Processes LINE webhook events relevant for conversion attribution and messaging.
 * @param {object[]} events
 */
async function processEvents(events) {
  const prisma = await getPrisma();

  for (const event of events) {
    if (event.type !== 'message') continue;

    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    const text = event.message?.text ?? '';
    
    // 1. Resolve Customer & Conversation (NFR5)
    let customer = await prisma.customer.findFirst({
        where: { lineId: lineUserId }
    });

    if (!customer) {
        // Fallback or create? For now, we use lineService logic
        // But we need the ID here for the Message table
        const { randomUUID } = await import('crypto');
        const customerId = `TVS-CUS-LN-26-${randomUUID().slice(-4).toUpperCase()}`;
        customer = await prisma.customer.create({
            data: {
                customerId,
                lineId: lineUserId,
                status: 'Active',
                membershipTier: 'MEMBER'
            }
        });
    }

    const conversation = await prisma.conversation.upsert({
        where: { conversationId: lineUserId }, // For LINE, we use lineUserId as conversationId
        create: {
            conversationId: lineUserId,
            customerId: customer.id,
            channel: 'line',
            participantId: lineUserId,
            lastMessageAt: new Date(event.timestamp),
            unreadCount: 1
        },
        update: {
            lastMessageAt: new Date(event.timestamp),
            unreadCount: { increment: 1 }
        }
    });

    // 2. Record Message
    const msg = await prisma.message.create({
        data: {
            messageId: event.message.id || `ln_${crypto.randomUUID()}`,
            conversationId: conversation.id,
            fromId: lineUserId,
            content: text,
            createdAt: new Date(event.timestamp)
        }
    });

    // 3. Attribution (Existing logic)
    const phoneMatch = text.match(/0[6-9]\d{8}|(?:\+|00)66\d{8,9}/);
    const phone = phoneMatch ? phoneMatch[0] : '';
    const amountMatch = text.match(/(\d[\d,]+)\s*บาท/);
    const orderAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    if (phone || orderAmount > 0) {
        recordLineConversion({
            lineUserId,
            phone,
            orderAmount,
        }).catch(err => logger.error('line-webhook', 'recordLineConversion failed', err));
    }

    // 4. Trigger Notification Engine
    notificationEngine.evaluateRules('MESSAGE_RECEIVED', {
        message: { id: msg.messageId, content: msg.content },
        conversationId: lineUserId,
        channel: 'line',
        lineUserId
    }).catch(err => logger.error('line-webhook', 'notificationEngine failed', err));
  }
}
