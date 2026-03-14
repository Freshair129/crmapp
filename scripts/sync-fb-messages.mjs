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
import dotenv from 'dotenv';
dotenv.config();

const GRAPH_API      = 'https://graph.facebook.com/v19.0';
const PAGE_ID        = '170707786504';
const PAGE_TOKEN     = process.env.FB_PAGE_ACCESS_TOKEN || 'EAAMJp3v5Ai0BQuPbI1AhNzt9FhUP5L7eI0no0IeW4TpbSHzmIcMlrFxB9i9u1QsDSzltn7WGAjdVlOIJyn9m55YFpdDZBndGIS4qUTYDNgbLPMh7g3xqZCmyC9ZAZB3hqeMmNoM30dkeHnMOtn7SBVtDSJtgo9klB1XPYIyziZBJ74GB1oV4abes7F4ehe2sZD';
const SUPABASE_URL   = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5433/vschool_crm';
const DAYS           = Math.min(parseInt(process.argv[2] || '90', 10), 90);
const BATCH_SIZE     = 50; // messages per Graph API request

let db;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error) return { data: null, error: data.error };
                throw new Error(`HTTP ${res.status}`);
            }
            return { data: await res.json(), error: null };
        } catch (err) {
            if (i === retries) throw err;
            console.log(`  🔄 Retry ${i + 1}/${retries} for ${url} after error: ${err.message}`);
            await sleep(2000 * (i + 1));
        }
    }
}

async function graphGet(path, params = {}, retries = 3) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', PAGE_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

    for (let attempt = 0; attempt <= retries; attempt++) {
        const { data, error } = await fetchWithRetry(url.toString(), {}, 0); // retries handled by fetchWithRetry
        if (error) {
            console.error(`  ⚠️  Graph API Error: ${error.message} (Code: ${error.code})`);
            const isRate = error.code === 32 || error.code === 613 ||
                (error.message || '').toLowerCase().includes('limit');
            if (isRate && attempt < retries) {
                const wait = 60000 * (attempt + 1);
                console.log(`  ⚠️  Rate limit — waiting ${wait / 1000}s...`);
                await sleep(wait);
                continue;
            }
            throw new Error(`[Graph] ${error.message}`);
        }
        return data;
    }
}

async function paginate(path, params) {
    const results = [];
    const cutoffDate = new Date(Date.now() - DAYS * 86400000);
    console.log(`  → Paginating ${path} (cutoff: ${cutoffDate.toISOString()})`);
    
    let data = await graphGet(path, { ...params, limit: 100 });
    results.push(...(data.data || []));
    console.log(`    Fetched ${results.length} items...`);
    
    while (data.paging?.next) {
        // Stop if the oldest item in the current batch is older than cutoff
        const oldestInBatch = data.data?.[data.data.length - 1];
        if (oldestInBatch?.updated_time && new Date(oldestInBatch.updated_time) < cutoffDate) {
            console.log(`    Reached cutoff date (${oldestInBatch.updated_time}). Stopping pagination.`);
            break;
        }

        process.stdout.write(`    Fetching next page... (${results.length})\r`);
        const { data: nextPage, error } = await fetchWithRetry(data.paging.next);
        if (error) {
            console.error(`\n    ❌ Pagination error: ${error.message}`);
            break;
        }
        data = nextPage;
        results.push(...(data.data || []));
    }
    console.log(`\n    ✅ Pagination complete. Total: ${results.length}`);
    return results;
}

// ── Upsert customer by PSID ──────────────────────────────────────────────────
async function upsertCustomer(psid, name) {
    const existing = await db.query(
        'SELECT id FROM customers WHERE facebook_id = $1', [psid]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || 'FB User';
    const lastName  = nameParts.slice(1).join(' ') || null;

    // Try multiple times if collision occurs on random ID
    for (let attempt = 0; attempt < 5; attempt++) {
        const randomSuffix = attempt === 0 ? randomUUID().slice(-4).toUpperCase() : randomUUID().slice(-6).toUpperCase();
        const customerId = `TVS-CUS-FB-26-${randomSuffix}`;
        try {
            const res = await db.query(`
                INSERT INTO customers (id, customer_id, status, first_name, last_name,
                    facebook_id, facebook_name, membership_tier, lifecycle_stage, join_date,
                    created_at, updated_at)
                VALUES (gen_random_uuid(), $1, 'Active', $2, $3, $4, $5,
                    'MEMBER', 'Lead', NOW(), NOW(), NOW())
                ON CONFLICT (facebook_id) DO UPDATE SET
                    facebook_name = EXCLUDED.facebook_name, updated_at = NOW()
                RETURNING id
            `, [customerId, firstName, lastName, psid, name || null]);
            return res.rows[0].id;
        } catch (err) {
            if (err.code === '23505' && err.detail.includes('customer_id')) {
                console.log(`  🔄 customer_id collision (${customerId}), retrying...`);
                continue;
            }
            throw err;
        }
    }
}

// ── Upsert conversation ──────────────────────────────────────────────────────
async function upsertConversation(threadId, customerId, psid, lastMsgAt, name) {
    const res = await db.query(`
        INSERT INTO conversations (id, conversation_id, customer_id, channel,
            participant_id, participant_name, last_message_at, unread_count, is_starred, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 'facebook', $3, $4, $5, 0, false, NOW(), NOW())
        ON CONFLICT (conversation_id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            participant_name = COALESCE(EXCLUDED.participant_name, conversations.participant_name),
            last_message_at = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at),
            updated_at = NOW()
        RETURNING id
    `, [threadId, customerId, psid, name || null, lastMsgAt]);
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
        const convUuid   = await upsertConversation(threadId, customerId, psid, updatedAt, name);
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

        // Paginate if more messages exist (up to cutoff)
        const cutoff = new Date(Date.now() - DAYS * 86400000);
        while (msgData.paging?.next) {
            const oldest = allMessages[allMessages.length - 1];
            if (oldest && new Date(oldest.created_time) < cutoff) break;
            try {
                const { data: nextPage, error } = await fetchWithRetry(msgData.paging.next);
                if (error || !nextPage) break;
                msgData = nextPage;
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
