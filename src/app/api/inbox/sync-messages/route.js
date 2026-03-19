import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const GRAPH = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// ─── ID Generator ─────────────────────────────────────────────────────────────
function generateSyncId() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SYNC-MSG-${date}-${rnd}`;
}

// ─── GET /api/inbox/sync-messages — list all sync sessions ────────────────────
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const prisma = await getPrisma();
        const sessions = await prisma.$queryRaw`
            SELECT id, status, from_date, to_date,
                   total_conversations, processed_conversations,
                   new_messages, duplicate_messages,
                   created_at, updated_at, error,
                   metadata
            FROM message_sync_sessions
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;

        return NextResponse.json({ sessions });
    } catch (error) {
        logger.error('[SyncMessages GET]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── POST /api/inbox/sync-messages — start a new sync session ─────────────────
// Body: { from: "2026-02-01", to: "2026-03-01" }  (ISO date strings, Bangkok time assumed)
export async function POST(request) {
    if (!PAGE_TOKEN || !PAGE_ID) {
        return NextResponse.json({ error: 'FB credentials not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const fromStr = body.from;
    const toStr = body.to;

    if (!fromStr || !toStr) {
        return NextResponse.json({ error: 'from and to dates required (YYYY-MM-DD)' }, { status: 400 });
    }

    const fromDate = new Date(fromStr + 'T00:00:00+07:00');
    const toDate = new Date(toStr + 'T00:00:00+07:00');

    if (isNaN(fromDate) || isNaN(toDate) || fromDate >= toDate) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const syncId = generateSyncId();
    const prisma = await getPrisma();

    // Create sync session record
    await prisma.$executeRaw`
        INSERT INTO message_sync_sessions (id, status, from_date, to_date, created_at, updated_at)
        VALUES (${syncId}, 'RUNNING', ${fromDate}, ${toDate}, NOW(), NOW())
    `;

    logger.info('[SyncMessages]', `Started ${syncId} — ${fromStr} → ${toStr}`);

    const sinceUnix = Math.floor(fromDate.getTime() / 1000);
    const untilUnix = Math.floor(toDate.getTime() / 1000);

    // ── Step 1: Fetch conversations active in the date range from FB ──────────
    let allConvs = [];
    try {
        let url = `${GRAPH}/${PAGE_ID}/conversations?fields=participants,updated_time&limit=50&since=${sinceUnix}&until=${untilUnix}&access_token=${PAGE_TOKEN}`;
        let pageNum = 0;
        const MAX_CONV_PAGES = 6; // max 300 conversations per sync call

        while (url && pageNum < MAX_CONV_PAGES) {
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) {
                throw new Error(`FB API: ${data.error.message}`);
            }
            allConvs = allConvs.concat(data.data || []);
            url = data.paging?.next || null;
            pageNum++;
        }
    } catch (err) {
        await _failSync(prisma, syncId, err.message);
        return NextResponse.json({ syncId, status: 'FAILED', error: err.message }, { status: 502 });
    }

    // Update total_conversations count
    await prisma.$executeRaw`
        UPDATE message_sync_sessions
        SET total_conversations = ${allConvs.length}, updated_at = NOW()
        WHERE id = ${syncId}
    `;

    logger.info('[SyncMessages]', `${syncId}: found ${allConvs.length} conversations`);

    // ── Step 2: For each conversation, upsert customer + fetch messages ───────
    // Process up to 15 conversations within Vercel's 10s budget
    // Remaining ones need a follow-up call (resume support via cursor)
    const BATCH_LIMIT = 15;
    const toProcess = allConvs.slice(0, BATCH_LIMIT);
    const remaining = allConvs.slice(BATCH_LIMIT);

    let newMessages = 0;
    let duplicates = 0;
    let processedConvs = 0;
    const errors = [];

    for (const conv of toProcess) {
        try {
            const participants = conv.participants?.data || [];
            const customer = participants.find(p => p.id !== PAGE_ID);
            if (!customer?.id) continue;

            const psid = customer.id;
            const participantName = customer.name || null;

            // Upsert customer
            let dbCustomer = await prisma.customer.findFirst({ where: { facebookId: psid } });
            if (!dbCustomer) {
                const [firstName, ...rest] = (participantName || 'FB-' + psid.slice(-6)).trim().split(' ');
                const customerId = `TVS-CUS-FB-${new Date().getFullYear().toString().slice(-2)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                dbCustomer = await prisma.customer.create({
                    data: {
                        customerId,
                        facebookId: psid,
                        facebookName: participantName,
                        firstName,
                        lastName: rest.join(' ') || null,
                        lifecycleStage: 'Lead',
                        membershipTier: 'MEMBER',
                    }
                });
            } else if (!dbCustomer.firstName && participantName) {
                const [firstName, ...rest] = participantName.trim().split(' ');
                await prisma.customer.update({
                    where: { id: dbCustomer.id },
                    data: { firstName, lastName: rest.join(' ') || null, facebookName: participantName }
                });
            }

            // Upsert conversation
            const convId = `t_${psid}`;
            let dbConv = await prisma.conversation.findFirst({ where: { conversationId: convId } });
            if (!dbConv) {
                dbConv = await prisma.conversation.create({
                    data: {
                        conversationId: convId,
                        channel: 'FACEBOOK',
                        status: 'open',
                        participantId: psid,
                        participantName,
                        customer: { connect: { id: dbCustomer.id } }
                    }
                });
            } else if (!dbConv.participantName && participantName) {
                dbConv = await prisma.conversation.update({
                    where: { id: dbConv.id },
                    data: { participantName }
                });
            }

            // Find FB conversation ID to fetch messages
            const convLookupRes = await fetch(
                `${GRAPH}/${PAGE_ID}/conversations?user_id=${psid}&fields=id&access_token=${PAGE_TOKEN}`
            );
            const convLookupData = await convLookupRes.json();
            const fbConvId = convLookupData.data?.[0]?.id;
            if (!fbConvId) { processedConvs++; continue; }

            // Fetch messages for this conversation in the date range
            const msgRes = await fetch(
                `${GRAPH}/${fbConvId}/messages?fields=message,from,created_time,attachments,sticker&limit=100&since=${sinceUnix}&until=${untilUnix}&access_token=${PAGE_TOKEN}`
            );
            const msgData = await msgRes.json();
            const msgs = msgData.data || [];

            for (const msg of msgs) {
                const isFromPage = msg.from?.id === PAGE_ID;
                const msgText = msg.message || null;
                const hasAttachment = !!(msg.attachments?.data?.length || msg.sticker);
                const attachment = msg.attachments?.data?.[0] || null;

                try {
                    await prisma.message.upsert({
                        where: { messageId: msg.id },
                        create: {
                            messageId: msg.id,
                            conversationId: dbConv.id,
                            content: msgText,
                            fromName: isFromPage ? 'Admin' : (participantName || null),
                            fromId: msg.from?.id || null,
                            responderId: isFromPage ? PAGE_ID : null,
                            hasAttachment,
                            attachmentType: attachment?.type || null,
                            attachmentUrl: attachment?.file_url || attachment?.image_data?.url || null,
                            metadata: isFromPage ? { is_echo: true } : {},
                            createdAt: new Date(msg.created_time),
                        },
                        update: {} // no update if already exists
                    });
                    newMessages++;
                } catch (e) {
                    if (e.code === 'P2002') {
                        duplicates++;
                    } else {
                        throw e;
                    }
                }
            }

            processedConvs++;
        } catch (err) {
            errors.push(`${conv.participants?.data?.find(p => p.id !== PAGE_ID)?.id}: ${err.message}`);
        }
    }

    // ── Step 3: Determine final status ────────────────────────────────────────
    const hasMore = remaining.length > 0;
    const finalStatus = errors.length > 0 && processedConvs === 0 ? 'FAILED'
        : hasMore ? 'PARTIAL'
        : 'COMPLETED';

    await prisma.$executeRaw`
        UPDATE message_sync_sessions
        SET status = ${finalStatus},
            processed_conversations = ${processedConvs},
            new_messages = ${newMessages},
            duplicate_messages = ${duplicates},
            updated_at = NOW(),
            metadata = ${JSON.stringify({
                remaining: remaining.length,
                errors: errors.slice(0, 10),
                fromStr, toStr
            })}::jsonb
        WHERE id = ${syncId}
    `;

    logger.info('[SyncMessages]', `${syncId}: ${finalStatus} — ${processedConvs} convs, ${newMessages} new msgs, ${duplicates} dupes`);

    return NextResponse.json({
        syncId,
        status: finalStatus,
        fromDate: fromStr,
        toDate: toStr,
        totalConversations: allConvs.length,
        processedConversations: processedConvs,
        newMessages,
        duplicateMessages: duplicates,
        remaining: remaining.length,
        note: hasMore ? `${remaining.length} conversations not yet processed — call again to continue` : undefined,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
}

async function _failSync(prisma, syncId, errorMsg) {
    try {
        await prisma.$executeRaw`
            UPDATE message_sync_sessions
            SET status = 'FAILED', error = ${errorMsg}, updated_at = NOW()
            WHERE id = ${syncId}
        `;
    } catch (_) {}
}
