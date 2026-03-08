/**
 * Facebook Page Messages Polling Sync
 * ดึงประวัติข้อความย้อนหลัง 90 วัน จาก Graph API
 *
 * Run: node scripts/sync-fb-messages.mjs [days]
 *   days = จำนวนวันย้อนหลัง (default: 90, max: 90)
 */

import { createRequire } from 'module';
import { randomUUID } from 'crypto';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const GRAPH_API      = 'https://graph.facebook.com/v19.0';
const PAGE_ID        = '170707786504';
const PAGE_TOKEN     = process.env.FB_PAGE_ACCESS_TOKEN || 'EAAMJp3v5Ai0BQuPbI1AhNzt9FhUP5L7eI0no0IeW4TpbSHzmIcMlrFxB9i9u1QsDSzltn7WGAjdVlOIJyn9m55YFpdDZBndGIS4qUTYDNgbLPMh7g3xqZCmyC9ZAZB3hqeMmNoM30dkeHnMOtn7SBVtDSJtgo9klB1XPYIyziZBJ74GB1oV4abes7F4ehe2sZD';
const SUPABASE_URL   = 'postgresql://postgres.qcxjallsoccqsgmrpqdz:Suanranger1295@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';
const DAYS           = Math.min(parseInt(process.argv[2] || '90', 10), 90);
const BATCH_SIZE     = 50; // messages per Graph API request

let db;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function graphGet(path, params = {}, retries = 3) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', PAGE_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res  = await fetch(url.toString());
        const data = await res.json();
        if (data.error) {
            const isRate = data.error.code === 32 || data.error.code === 613 ||
                (data.error.message || '').toLowerCase().includes('limit');
            if (isRate && attempt < retries) {
                const wait = 60000 * (attempt + 1);
                console.log(`  ⚠️  Rate limit — waiting ${wait / 1000}s...`);
                await sleep(wait);
                continue;
            }
            throw new Error(`[Graph] ${data.error.message}`);
        }
        return data;
    }
}

async function paginate(path, params) {
    const results = [];
    let data = await graphGet(path, { ...params, limit: 100 });
    results.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next);
        data = await res.json();
        if (data.error) break;
        results.push(...(data.data || []));
    }
    return results;
}

// ── Upsert customer by PSID ──────────────────────────────────────────────────
async function upsertCustomer(psid, name) {
    const existing = await db.query(
        'SELECT id FROM customers WHERE facebook_id = $1', [psid]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const customerId = `TVS-CUS-FB-26-${randomUUID().slice(-4).toUpperCase()}`;
    const nameParts  = (name || '').trim().split(' ');
    const res = await db.query(`
        INSERT INTO customers (id, customer_id, status, first_name, last_name,
            facebook_id, facebook_name, membership_tier, lifecycle_stage, join_date,
            created_at, updated_at)
        VALUES (gen_random_uuid(), $1, 'Active', $2, $3, $4, $5,
            'MEMBER', 'Lead', NOW(), NOW(), NOW())
        ON CONFLICT (facebook_id) DO UPDATE SET
            facebook_name = EXCLUDED.facebook_name, updated_at = NOW()
        RETURNING id
    `, [customerId, nameParts[0] || null, nameParts.slice(1).join(' ') || null, psid, name || null]);
    return res.rows[0].id;
}

// ── Upsert conversation ──────────────────────────────────────────────────────
async function upsertConversation(threadId, customerId, psid, lastMsgAt) {
    const res = await db.query(`
        INSERT INTO conversations (id, conversation_id, customer_id, channel,
            participant_id, last_message_at, unread_count, is_starred, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 'facebook', $3, $4, 0, false, NOW(), NOW())
        ON CONFLICT (conversation_id) DO UPDATE SET
            last_message_at = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at),
            updated_at = NOW()
        RETURNING id
    `, [threadId, customerId, psid, lastMsgAt]);
    return res.rows[0].id;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    db = new Client({ connectionString: SUPABASE_URL });
    await db.connect();
    console.log(`✅ Connected to Supabase | Polling last ${DAYS} days\n`);

    // ── 1. Fetch all conversations ────────────────────────────────────────────
    console.log('Fetching conversations...');
    const conversations = await paginate(`/${PAGE_ID}/conversations`, {
        fields: 'id,participants,updated_time,message_count',
        platform: 'messenger',
    });
    console.log(`  → ${conversations.length} conversations found\n`);

    let convCount = 0, msgCount = 0, skipCount = 0;

    for (const conv of conversations) {
        // Find customer participant (not the page)
        const customer = conv.participants?.data?.find(p => p.id !== PAGE_ID);
        if (!customer) { skipCount++; continue; }

        const psid      = customer.id;
        const name      = customer.name || null;
        const threadId  = `t_${psid}`;
        const updatedAt = new Date(conv.updated_time);

        // Upsert customer + conversation
        const customerId = await upsertCustomer(psid, name);
        const convUuid   = await upsertConversation(threadId, customerId, psid, updatedAt);
        convCount++;

        // ── 2. Fetch messages for this conversation ───────────────────────────
        let msgData;
        try {
            msgData = await graphGet(`/${conv.id}/messages`, {
                fields: 'id,message,from,created_time,attachments',
                limit: BATCH_SIZE,
            });
        } catch (err) {
            console.error(`  ✗ messages for ${threadId}: ${err.message}`);
            continue;
        }

        const allMessages = [...(msgData.data || [])];

        // Paginate if more messages exist (up to 90 days)
        const cutoff = new Date(Date.now() - DAYS * 86400000);
        let cursor = msgData.paging?.cursors?.before;
        while (msgData.paging?.next) {
            const oldest = allMessages[allMessages.length - 1];
            if (oldest && new Date(oldest.created_time) < cutoff) break;
            try {
                const res = await fetch(msgData.paging.next);
                msgData = await res.json();
                if (msgData.error) break;
                allMessages.push(...(msgData.data || []));
            } catch { break; }
        }

        // Upsert messages
        for (const msg of allMessages) {
            if (!msg.id || new Date(msg.created_time) < cutoff) continue;
            const attach = msg.attachments?.data?.[0];
            const isPage = msg.from?.id === PAGE_ID;
            try {
                await db.query(`
                    INSERT INTO messages (id, message_id, conversation_id,
                        from_id, from_name, content,
                        has_attachment, attachment_type, attachment_url,
                        created_at)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (message_id) DO NOTHING
                `, [
                    msg.id,
                    convUuid,
                    msg.from?.id || null,
                    msg.from?.name || null,
                    msg.message || null,
                    !!attach,
                    attach?.mime_type?.split('/')[0] || null,
                    attach?.file_url || null,
                    new Date(msg.created_time),
                ]);
                msgCount++;
            } catch { /* skip duplicate */ }
        }

        process.stdout.write(`\r  conv: ${convCount}/${conversations.length}  msgs: ${msgCount}`);
    }

    await db.end();
    console.log('\n');
    console.log('══════════════════════════════════════');
    console.log(`  conversations : ${convCount}`);
    console.log(`  messages      : ${msgCount}`);
    console.log(`  skipped       : ${skipCount}`);
    console.log('══════════════════════════════════════');
    console.log('✅ Done');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
