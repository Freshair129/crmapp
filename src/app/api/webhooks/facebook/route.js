import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { getPrisma } from '@/lib/db';
import { eventBus } from '@/lib/eventBus';
import { notificationEngine } from '@/lib/notificationEngine';

/**
 * Fire-and-forget: fetch sender name from FB Graph API and update customer record.
 * Called outside prisma.$transaction so it doesn't block webhook < 200ms.
 */
async function enrichCustomerName(customerId, psid) {
    const token = process.env.FB_PAGE_ACCESS_TOKEN;
    const res = await fetch(`https://graph.facebook.com/v19.0/${psid}?fields=name&access_token=${token}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.name) return;
    const [firstName, ...rest] = data.name.split(' ');
    const prisma = await getPrisma();
    await prisma.customer.update({
        where: { id: customerId },
        data: {
            facebookName: data.name,
            firstName,
            lastName: rest.join(' ') || null,
        },
    });
}

const KNOWN_PAGE_IDS = [
    process.env.FB_PAGE_ID,
    ...(process.env.FB_KNOWN_PAGE_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
].filter(Boolean);

// ── GET: Webhook verification ────────────────────────────────────────────────
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mode      = searchParams.get('hub.mode');
    const token     = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
        logger.info('FacebookWebhook', 'Verified');
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

// ── POST: Receive events ─────────────────────────────────────────────────────
// NFR1: Must respond < 200ms — process async, return immediately
export async function POST(request) {
    const body      = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!signature) return new NextResponse('Missing signature', { status: 401 });

    const hmac = crypto.createHmac('sha256', process.env.FB_APP_SECRET || '');
    const expected = `sha256=${hmac.update(body).digest('hex')}`;
    if (signature !== expected) return new NextResponse('Invalid signature', { status: 401 });

    const data = JSON.parse(body);
    if (data.object === 'page') {
        for (const entry of data.entry) {
            for (const event of (entry.messaging || [])) {
                processEvent(event).catch(err =>
                    logger.error('FacebookWebhook', 'processEvent failed', err)
                );
            }
        }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' });
}

// ── Event processor ──────────────────────────────────────────────────────────
async function processEvent(event) {
    const { sender, recipient, timestamp, message, delivery, read, referral } = event;

    // Handle FB read-receipt: admin read in Business Suite → reset unreadCount in DB
    if (read && !message) {
        const isFromPage    = KNOWN_PAGE_IDS.includes(sender.id);
        const customerPsid  = isFromPage ? recipient.id : sender.id;
        const threadId      = `t_${customerPsid}`;
        const prisma = await getPrisma();
        await prisma.$transaction(async (tx) => {
            await tx.conversation.updateMany({
                where: { conversationId: threadId },
                data:  { unreadCount: 0 },
            });
        });
        logger.info('FacebookWebhook', `FB read-receipt: unreadCount reset for ${threadId}`);
        return;
    }

    if (!message || (message.is_echo === true && !message.text && !message.attachments)) return;

    const isFromPage  = KNOWN_PAGE_IDS.includes(sender.id) || message?.is_echo === true;
    const customerPsid = isFromPage ? recipient.id : sender.id;
    const threadId     = `t_${customerPsid}`;   // FB thread convention

    const prisma = await getPrisma();

    // Track new customer for post-tx enrichment
    let newCustomerId = null;

    // 1. Upsert conversation + customer (NFR5: transaction)
    await prisma.$transaction(async (tx) => {
        // Ensure customer exists
        let customer = await tx.customer.findFirst({
            where: { facebookId: customerPsid },
            select: { id: true },
        });

        if (!customer) {
            const { randomUUID } = await import('crypto');
            const customerId = `TVS-CUS-FB-26-${randomUUID().slice(-4).toUpperCase()}`;
            try {
                customer = await tx.customer.create({
                    data: {
                        customerId,
                        status: 'Active',
                        membershipTier: 'MEMBER',
                        lifecycleStage: 'Lead',
                        facebookId: customerPsid,
                        joinDate: new Date(),
                    },
                    select: { id: true },
                });
                newCustomerId = customer.id; // mark for post-tx name enrichment
            } catch (err) {
                if (err.code === 'P2002') {
                    logger.info('FacebookWebhook', `Race condition recovered for PSID ${customerPsid}`);
                    customer = await tx.customer.findFirst({
                        where: { facebookId: customerPsid },
                        select: { id: true },
                    });
                    if (!customer) throw err; // real error
                } else {
                    throw err;
                }
            }
        }

        // Upsert conversation
        const conv = await tx.conversation.upsert({
            where: { conversationId: threadId },
            create: {
                conversationId: threadId,
                customerId: customer.id,
                channel: 'facebook',
                participantId: customerPsid,
                lastMessageAt: new Date(timestamp),
                unreadCount: isFromPage ? 0 : 1,
                // Ad attribution
                ...(referral?.ad_id ? {} : {}),
            },
            update: {
                lastMessageAt: new Date(timestamp),
                unreadCount: isFromPage ? 0 : { increment: 1 },
            },
            select: { id: true, unreadCount: true },
        });

        // 2. Upsert message
        if (message.mid) {
            const attach = (message.attachments || [])[0];
            const isEcho = message.is_echo === true || KNOWN_PAGE_IDS.includes(sender.id);
            
            await tx.message.upsert({
                where: { messageId: message.mid },
                create: {
                    messageId: message.mid,
                    conversationId: conv.id,
                    fromId: sender.id,
                    fromName: isEcho ? 'Admin' : null,
                    content: message.text || null,
                    hasAttachment: !!attach,
                    attachmentType: attach?.type || null,
                    attachmentUrl: attach?.payload?.url || null,
                    createdAt: new Date(timestamp),
                    metadata: {
                        ...(referral ? { ad_id: referral.ad_id, source: referral.source } : {}),
                        is_echo: isEcho
                    },
                },
                update: {},  // never overwrite existing message
            });
        }
    });

    // 3. Fire-and-forget: enrich new customer name from FB Graph API
    if (newCustomerId && !isFromPage && process.env.FB_PAGE_ACCESS_TOKEN) {
        enrichCustomerName(newCustomerId, customerPsid).catch(err =>
            logger.warn('FacebookWebhook', `Name enrichment failed for ${customerPsid}`, err)
        );
    }

    // 4. Broadcast real-time update to all connected SSE clients
    eventBus.emit('chat-update', { conversationId: threadId, customerPsid, isFromPage });
    logger.info('FacebookWebhook', `chat-update emitted for ${threadId}`);

    // 4. Trigger Notification Engine (Rule evaluation)
    if (!isFromPage && message.mid) {
        notificationEngine.evaluateRules('MESSAGE_RECEIVED', {
            message: { id: message.mid, content: message.text, metadata: message.metadata },
            conversationId: threadId,
            channel: 'facebook',
            customerPsid
        }).catch(err => logger.error('FacebookWebhook', 'notificationEngine failed', err));
    }
}
