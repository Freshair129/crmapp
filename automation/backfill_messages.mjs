/**
 * backfill_messages.mjs
 * ดึงข้อความจาก Facebook Graph API ย้อนหลัง แล้วบันทึกลง Supabase
 *
 * วิธีรัน:
 *   node automation/backfill_messages.mjs
 *   node automation/backfill_messages.mjs --from=2026-01-01 --to=2026-03-19
 *   node automation/backfill_messages.mjs --resume=SYNC-MSG-20260319-XXXX
 *
 * ตัวเลือก:
 *   --from=YYYY-MM-DD   วันเริ่มต้น (default: 2026-01-01)
 *   --to=YYYY-MM-DD     วันสิ้นสุด (default: วันนี้)
 *   --resume=SYNC-ID    ดึงต่อจาก session เดิมที่ค้างอยู่
 *   --dry-run           แสดงผลอย่างเดียว ไม่บันทึกลง DB
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ────────────────────────────────────────────────────────────────────
// โหลดจาก .env ที่ root project
const envPath = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^"|"$/g, '');
    });
}

const PAGE_TOKEN  = env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID     = env.FB_PAGE_ID;
const DATABASE_URL = env.DATABASE_URL;
const GRAPH       = 'https://graph.facebook.com/v19.0';

if (!PAGE_TOKEN || !PAGE_ID || !DATABASE_URL) {
    console.error('❌ กรุณาตรวจสอบ .env ว่ามี FB_PAGE_ACCESS_TOKEN, FB_PAGE_ID, DATABASE_URL');
    process.exit(1);
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];

const FROM_STR  = getArg('from') || '2026-01-01';
const TO_STR    = getArg('to')   || new Date().toISOString().slice(0, 10);
const RESUME_ID = getArg('resume');
const DRY_RUN   = args.includes('--dry-run');

const fromDate  = new Date(FROM_STR + 'T00:00:00+07:00');
const toDate    = new Date(TO_STR   + 'T23:59:59+07:00');
const sinceUnix = Math.floor(fromDate.getTime() / 1000);
const untilUnix = Math.floor(toDate.getTime()   / 1000);

console.log(`\n📅 Backfill: ${FROM_STR} → ${TO_STR}${DRY_RUN ? ' [DRY RUN]' : ''}`);
console.log(`   PAGE_ID: ${PAGE_ID}\n`);

// ─── DB ────────────────────────────────────────────────────────────────────────
const { Client } = pg;
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('✅ DB connected\n');

// ─── Sync ID ──────────────────────────────────────────────────────────────────
function generateSyncId() {
    const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const r = Math.random().toString(36).slice(2,6).toUpperCase();
    return `SYNC-MSG-${d}-${r}`;
}

let syncId = RESUME_ID || generateSyncId();
let resumeFrom = 0; // index ของ conversation ที่จะเริ่มต่อ

// ─── สร้างหรือโหลด sync session ───────────────────────────────────────────────
if (RESUME_ID) {
    const res = await client.query('SELECT * FROM message_sync_sessions WHERE id = $1', [RESUME_ID]);
    if (res.rows.length === 0) {
        console.error(`❌ ไม่พบ sync session: ${RESUME_ID}`);
        await client.end(); process.exit(1);
    }
    const s = res.rows[0];
    resumeFrom = s.processed_conversations || 0;
    console.log(`🔄 Resume: ${RESUME_ID} (ทำไปแล้ว ${resumeFrom} conv)`);
} else if (!DRY_RUN) {
    await client.query(`
        INSERT INTO message_sync_sessions
            (id, status, from_date, to_date, created_at, updated_at, metadata)
        VALUES ($1, 'RUNNING', $2, $3, NOW(), NOW(), $4)
    `, [syncId, fromDate, toDate, JSON.stringify({ fromStr: FROM_STR, toStr: TO_STR, source: 'local_script' })]);
    console.log(`🆔 Sync ID: ${syncId}\n`);
}

// ─── Step 1: ดึง Conversations จาก FB ─────────────────────────────────────────
// หมายเหตุ: FB cursor pagination ทะลุ since/until ได้ ต้องเช็ค updated_time เอง
console.log('📡 กำลังดึง conversations จาก Facebook...');
let allConvs = [];
let convUrl = `${GRAPH}/${PAGE_ID}/conversations?fields=participants,updated_time&limit=100&since=${sinceUnix}&until=${untilUnix}&access_token=${PAGE_TOKEN}`;
let pageNum = 0;
let hitBoundary = false;

while (convUrl && !hitBoundary) {
    const res = await fetch(convUrl);
    const data = await res.json();
    if (data.error) {
        console.error('❌ FB API error:', data.error.message);
        break;
    }
    const batch = data.data || [];

    for (const conv of batch) {
        const updatedTime = new Date(conv.updated_time);
        // หยุดเมื่อ conversation เก่ากว่า fromDate (sorted desc by updated_time)
        if (updatedTime < fromDate) {
            hitBoundary = true;
            break;
        }
        allConvs.push(conv);
    }

    process.stdout.write(`   page ${++pageNum}: ${allConvs.length} conversations\r`);
    convUrl = (!hitBoundary && data.paging?.next) || null;
}

console.log(`\n✅ พบ ${allConvs.length} conversations active ใน ${FROM_STR} → ${TO_STR}\n`);

if (!DRY_RUN) {
    await client.query(
        'UPDATE message_sync_sessions SET total_conversations=$1, updated_at=NOW() WHERE id=$2',
        [allConvs.length, syncId]
    );
}

// Skip conversations ที่ทำไปแล้วตอน resume
const toProcess = allConvs.slice(resumeFrom);
console.log(`📋 ประมวลผล ${toProcess.length} conversations${resumeFrom > 0 ? ` (ข้าม ${resumeFrom} ที่ทำแล้ว)` : ''}...\n`);

// ─── Step 2: Process แต่ละ conversation ───────────────────────────────────────
let totalNewMessages  = 0;
let totalDuplicates   = 0;
let totalNewCustomers = 0;
let processedCount    = resumeFrom;
let errorList         = [];

for (let i = 0; i < toProcess.length; i++) {
    const conv = toProcess[i];
    const participants = conv.participants?.data || [];
    const customer = participants.find(p => p.id !== PAGE_ID);
    if (!customer?.id) continue;

    const psid = customer.id;
    const participantName = customer.name || null;
    const convIndex = resumeFrom + i + 1;

    process.stdout.write(`[${convIndex}/${allConvs.length}] ${participantName || psid}...`);

    try {
        // ── 2a. Upsert Customer ──────────────────────────────────────────────
        let dbCustomer = null;
        const custRes = await client.query(
            'SELECT id, first_name FROM customers WHERE facebook_id = $1', [psid]
        );

        if (custRes.rows.length === 0 && !DRY_RUN) {
            const [firstName, ...rest] = (participantName || ('FB-' + psid.slice(-6))).trim().split(' ');
            const custId = `TVS-CUS-FB-26-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
            const uuid = randomUUID();
            const ins = await client.query(`
                INSERT INTO customers (id, customer_id, facebook_id, facebook_name, first_name, last_name,
                    membership_tier, lifecycle_stage, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,'MEMBER','Lead',NOW(),NOW())
                ON CONFLICT (facebook_id) DO UPDATE SET updated_at=NOW()
                RETURNING id
            `, [uuid, custId, psid, participantName, firstName, rest.join(' ') || null]);
            dbCustomer = { id: ins.rows[0].id };
            totalNewCustomers++;
        } else {
            dbCustomer = custRes.rows[0];
            // backfill ชื่อถ้ายังไม่มี
            if (!dbCustomer?.first_name && participantName && !DRY_RUN) {
                const [firstName, ...rest] = participantName.trim().split(' ');
                await client.query(
                    'UPDATE customers SET first_name=$1, last_name=$2, facebook_name=$3, updated_at=NOW() WHERE facebook_id=$4',
                    [firstName, rest.join(' ') || null, participantName, psid]
                );
            }
        }

        // ── 2b. Upsert Conversation ──────────────────────────────────────────
        const convThreadId = `t_${psid}`;
        let dbConvId = null;

        if (!DRY_RUN) {
            // หา customer id ถ้ายังไม่มี
            if (!dbCustomer?.id) {
                const r = await client.query('SELECT id FROM customers WHERE facebook_id=$1', [psid]);
                dbCustomer = r.rows[0];
            }

            const convUpsert = await client.query(`
                INSERT INTO conversations (id, conversation_id, channel, status, participant_id, participant_name, customer_id, created_at, updated_at)
                VALUES ($1,$2,'FACEBOOK','open',$3,$4,$5,NOW(),NOW())
                ON CONFLICT (conversation_id) DO UPDATE SET
                    participant_name = COALESCE(conversations.participant_name, EXCLUDED.participant_name),
                    updated_at = NOW()
                RETURNING id
            `, [randomUUID(), convThreadId, psid, participantName, dbCustomer?.id]);
            dbConvId = convUpsert.rows[0].id;
        }

        // ── 2c. หา FB Conversation ID เพื่อดึงข้อความ ────────────────────────
        const fbConvLookup = await fetch(
            `${GRAPH}/${PAGE_ID}/conversations?user_id=${psid}&fields=id&access_token=${PAGE_TOKEN}`
        );
        const fbConvData = await fbConvLookup.json();
        const fbConvId = fbConvData.data?.[0]?.id;

        if (!fbConvId) {
            process.stdout.write(` ⚠️  ไม่พบ FB conv ID\n`);
            processedCount++;
            continue;
        }

        // ── 2d. ดึง Messages ──────────────────────────────────────────────────
        let msgCount = 0, dupCount = 0;
        let msgUrl = `${GRAPH}/${fbConvId}/messages?fields=message,from,created_time,attachments,sticker&limit=100&since=${sinceUnix}&until=${untilUnix}&access_token=${PAGE_TOKEN}`;

        while (msgUrl) {
            const mRes = await fetch(msgUrl);
            const mData = await mRes.json();
            if (mData.error) break;

            for (const msg of (mData.data || [])) {
                if (!msg.id) continue;
                const isFromPage  = msg.from?.id === PAGE_ID;
                const msgText     = msg.message || null;
                const hasAttach   = !!(msg.attachments?.data?.length || msg.sticker);
                const attach      = msg.attachments?.data?.[0] || null;
                const attachUrl   = attach?.file_url || attach?.image_data?.url || attach?.payload?.url || null;
                const attachType  = attach?.type || (msg.sticker ? 'sticker' : null);

                if (DRY_RUN) { msgCount++; continue; }

                try {
                    await client.query(`
                        INSERT INTO messages
                            (id, message_id, conversation_id, content, from_name, from_id,
                             responder_id, has_attachment, attachment_type, attachment_url,
                             metadata, created_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                        ON CONFLICT (message_id) DO NOTHING
                    `, [
                        randomUUID(),
                        msg.id,
                        dbConvId,
                        msgText,
                        isFromPage ? 'Admin' : participantName,
                        msg.from?.id || null,
                        null, // responder_id — FK constraint, ใช้ is_echo ใน metadata แทน
                        hasAttach,
                        attachType,
                        attachUrl,
                        JSON.stringify({ is_echo: isFromPage }),
                        new Date(msg.created_time),
                    ]);
                    msgCount++;
                } catch (e) {
                    if (e.code === '23505') dupCount++; // unique_violation
                    else throw e;
                }
            }

            msgUrl = mData.paging?.next || null;
        }

        totalNewMessages += msgCount;
        totalDuplicates  += dupCount;
        processedCount++;

        process.stdout.write(` ✅ ${msgCount} ข้อความ${dupCount > 0 ? ` (${dupCount} ซ้ำ)` : ''}\n`);

    } catch (err) {
        errorList.push(`${psid}: ${err.message}`);
        process.stdout.write(` ❌ ${err.message}\n`);
        processedCount++;
    }

    // อัปเดต progress ทุก 10 conversation
    if (!DRY_RUN && processedCount % 10 === 0) {
        await client.query(`
            UPDATE message_sync_sessions
            SET processed_conversations=$1, new_messages=$2, duplicate_messages=$3, updated_at=NOW()
            WHERE id=$4
        `, [processedCount, totalNewMessages, totalDuplicates, syncId]);
    }
}

// ─── Step 3: บันทึกผลสุดท้าย ──────────────────────────────────────────────────
const finalStatus = errorList.length > 0 && processedCount === 0 ? 'FAILED' : 'COMPLETED';

if (!DRY_RUN) {
    await client.query(`
        UPDATE message_sync_sessions
        SET status=$1,
            processed_conversations=$2,
            new_messages=$3,
            duplicate_messages=$4,
            updated_at=NOW(),
            metadata = metadata || $5::jsonb
        WHERE id=$6
    `, [
        finalStatus, processedCount, totalNewMessages, totalDuplicates,
        JSON.stringify({ errors: errorList.slice(0, 20) }),
        syncId
    ]);
}

await client.end();

console.log('\n' + '─'.repeat(50));
console.log(`✅ เสร็จสิ้น — ${finalStatus}`);
console.log(`   Sync ID       : ${syncId}`);
console.log(`   Conversations : ${processedCount}/${allConvs.length}`);
console.log(`   ข้อความใหม่    : ${totalNewMessages}`);
console.log(`   ข้อความซ้ำ    : ${totalDuplicates}`);
console.log(`   ลูกค้าใหม่     : ${totalNewCustomers}`);
if (errorList.length > 0) {
    console.log(`   ⚠️  Errors (${errorList.length}):`, errorList.slice(0,5));
}
console.log('─'.repeat(50) + '\n');
