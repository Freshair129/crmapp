#!/usr/bin/env node
/**
 * scripts/import-backup-chats.mjs
 *
 * Parse backup/aoi_feb_chats/*.md and backup/fah_feb_chats/*.md
 * and import Conversations + Messages into local PostgreSQL.
 *
 * Attribution per ADR-021 / ADR-022:
 *   [AOI] Name:               → staff Satabongkot Noinin (responderId from employees)
 *   [FAH] Name:               → staff Fafah Fasai
 *   [AOI/FAH] ...ส่งโดย Name: → embedded attribution, use extracted name
 *   [Admin: StaffName]:       → staff (hardcoded set)
 *   [Admin: ส่งโดย Name]:     → embedded attribution
 *   [Admin: The V School]:    → page-level, no individual attribution
 *   [Admin: CustomerName]:    → customer message
 *
 * Usage:
 *   node scripts/import-backup-chats.mjs [--dry-run]
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
    const require = createRequire(import.meta.url);
    const dotenv = require('dotenv');
    dotenv.config({ path: path.join(__dirname, '../.env.local') });
    dotenv.config({ path: path.join(__dirname, '../.env') });
} catch { /* dotenv optional */ }

const DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://postgres:password123@localhost:5432/vschool_crm';

const DRY_RUN = process.argv.includes('--dry-run');
const BACKUP_DIR = path.join(__dirname, '../backup');

// ─── Staff classification ────────────────────────────────────────────────────

// Names that are definitely staff (used for [Admin: Name] classification)
const STAFF_NAMES = new Set([
    'Satabongkot Noinin',
    'Fafah Fasai',
    'Fah (V School)',
    'Panxei',
    'Narongkorn Luathanaya',
]);

// Canonical FB name for employee lookup (keyed by display name variants)
const STAFF_FB_NAME = {
    'Satabongkot Noinin':   'Satabongkot Noinin',
    'Fafah Fasai':          'Fafah Fasai',
    'Fah (V School)':       'Fafah Fasai',   // same person
    'Panxei':               'Panxei',
    'Narongkorn Luathanaya': 'Narongkorn Luathanaya',
};

// ─── Sender parsing ──────────────────────────────────────────────────────────

/**
 * Parse senderTag (text between timestamp and ": content")
 * Returns { type: 'staff'|'customer'|'page'|'unknown', staffName?, customerName? }
 */
function parseSender(senderTag) {
    // [AOI] Name  or  [AOI] SomeText ส่งโดย RealName
    const aoiMatch = senderTag.match(/^\[AOI\]\s*(.*)$/);
    if (aoiMatch) {
        const namePart = aoiMatch[1].trim();
        const sentBy = namePart.match(/ส่งโดย\s+(.+)$/);
        const staffName = sentBy ? sentBy[1].trim() : 'Satabongkot Noinin';
        return { type: 'staff', staffName };
    }

    // [FAH] Name  or  [FAH] SomeText ส่งโดย RealName
    const fahMatch = senderTag.match(/^\[FAH\]\s*(.*)$/);
    if (fahMatch) {
        const namePart = fahMatch[1].trim();
        const sentBy = namePart.match(/ส่งโดย\s+(.+)$/);
        const staffName = sentBy ? sentBy[1].trim() : 'Fafah Fasai';
        return { type: 'staff', staffName };
    }

    // [Admin: Name]
    const adminMatch = senderTag.match(/^\[Admin:\s*(.+)\]$/s);
    if (adminMatch) {
        const name = adminMatch[1].trim();
        if (name === 'The V School') return { type: 'page' };

        // Embedded ส่งโดย (e.g. "ปิดปิด...ส่งโดย Satabongkot Noinin")
        const sentBy = name.match(/ส่งโดย\s+(.+)$/);
        if (sentBy) return { type: 'staff', staffName: sentBy[1].trim() };

        if (STAFF_NAMES.has(name)) return { type: 'staff', staffName: name };

        return { type: 'customer', customerName: name };
    }

    return { type: 'unknown' };
}

// ─── Backup file parsing ──────────────────────────────────────────────────────

const MSG_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] (\[(?:AOI|FAH)\][^:]*|\[Admin:[^\]]+\]): (.*)$/;

/**
 * Parse one MD file → array of { psid, conversationId, participantName, messages[] }
 */
function parseBackupFile(content) {
    const results = [];
    // Split on section dividers
    const sections = content.split(/\n---\n/);

    for (const section of sections) {
        const headerMatch = section.match(/### ลูกค้า: FB_CHAT_(\d+)/);
        if (!headerMatch) continue;

        const psid = headerMatch[1];
        const conversationId = `t_${psid}`;

        // Extract code block
        const codeMatch = section.match(/```\n([\s\S]*?)\n```/);
        if (!codeMatch) continue;

        const lines = codeMatch[1].split('\n');
        const messages = [];
        let participantName = null;

        for (const line of lines) {
            if (!line.trim()) continue;

            const m = line.match(MSG_LINE_RE);
            if (!m) continue;

            const [, timestampStr, senderTag, content] = m;

            // Parse timestamp as Bangkok time (UTC+7)
            const ts = new Date(timestampStr.replace(' ', 'T') + ':00+07:00');
            const sender = parseSender(senderTag);

            // Extract participant name from first customer message
            if (!participantName && sender.type === 'customer' && sender.customerName) {
                participantName = sender.customerName;
            }

            // Also try to extract from "Name ตอบกลับโฆษณา" page messages
            if (!participantName && sender.type === 'page') {
                const adReply = content.match(/^(.+?)\s+ตอบกลับโฆษณา/);
                if (adReply) participantName = adReply[1].trim();
            }

            const isAttachment = content.trim() === '(Attachment/Image)';

            messages.push({
                timestamp: ts,
                sender,
                content: isAttachment ? null : content,
                hasAttachment: isAttachment,
            });
        }

        results.push({ psid, conversationId, participantName, messages });
    }

    return results;
}

// ─── DB import ────────────────────────────────────────────────────────────────

async function run() {
    if (DRY_RUN) console.log('[DRY RUN] No data will be written.\n');

    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    console.log('Connected to DB:', DATABASE_URL.replace(/:([^:@]+)@/, ':***@'));

    // Load employees for staff → responderId resolution
    const { rows: employees } = await client.query(
        `SELECT id, first_name, last_name, nick_name, identities FROM employees`
    );

    const empByFbName = new Map();  // fb name (lowercase) → employee.id
    const empByFullName = new Map(); // "first last" (lowercase) → employee.id

    for (const emp of employees) {
        const fbName = emp.identities?.facebook?.name;
        if (fbName) empByFbName.set(fbName.toLowerCase(), emp.id);

        const fullName = `${emp.first_name} ${emp.last_name || ''}`.trim();
        empByFullName.set(fullName.toLowerCase(), emp.id);
        if (emp.nick_name) empByFullName.set(emp.nick_name.toLowerCase(), emp.id);
    }

    console.log(`Loaded ${employees.length} employees for attribution lookup`);

    function findEmployeeId(staffName) {
        if (!staffName) return null;
        const canonical = STAFF_FB_NAME[staffName] || staffName;
        return (
            empByFbName.get(canonical.toLowerCase()) ||
            empByFbName.get(staffName.toLowerCase()) ||
            empByFullName.get(staffName.toLowerCase()) ||
            null
        );
    }

    // Process all backup files
    const DIRS = ['aoi_feb_chats', 'fah_feb_chats'];
    const seenConvIds = new Set();
    let totalConvs = 0;
    let totalMsgs = 0;
    let skippedMsgs = 0;

    for (const dir of DIRS) {
        const dirPath = path.join(BACKUP_DIR, dir);
        const files = (await fs.readdir(dirPath))
            .filter(f => f.endsWith('.md'))
            .sort();

        for (const file of files) {
            console.log(`\n── ${dir}/${file}`);
            const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
            const convs = parseBackupFile(content);
            console.log(`   Found ${convs.length} conversations`);

            for (const conv of convs) {
                const isFirstSeen = !seenConvIds.has(conv.conversationId);
                seenConvIds.add(conv.conversationId);

                const lastMsg = conv.messages[conv.messages.length - 1];
                const lastMessageAt = lastMsg?.timestamp || new Date();

                // Upsert Conversation (only on first encounter)
                if (isFirstSeen && !DRY_RUN) {
                    await client.query(`
                        INSERT INTO conversations (
                            id, conversation_id, participant_id, participant_name,
                            channel, status, last_message_at, unread_count,
                            created_at, updated_at
                        )
                        VALUES (gen_random_uuid(), $1, $2, $3, 'facebook', 'closed', $4, 0, now(), now())
                        ON CONFLICT (conversation_id) DO UPDATE SET
                            participant_name = COALESCE(EXCLUDED.participant_name, conversations.participant_name),
                            last_message_at  = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at),
                            updated_at       = now()
                    `, [conv.conversationId, conv.psid, conv.participantName, lastMessageAt]);

                    totalConvs++;
                } else if (isFirstSeen) {
                    console.log(`   [DRY] Would upsert conv ${conv.conversationId} (${conv.participantName})`);
                    totalConvs++;
                }

                // Resolve internal conversation id
                let convInternalId = null;
                if (!DRY_RUN) {
                    const { rows } = await client.query(
                        'SELECT id FROM conversations WHERE conversation_id = $1',
                        [conv.conversationId]
                    );
                    convInternalId = rows[0]?.id;
                    if (!convInternalId) {
                        console.warn(`   !! Could not resolve internal id for ${conv.conversationId}`);
                        continue;
                    }
                }

                // Insert messages
                for (let i = 0; i < conv.messages.length; i++) {
                    const msg = conv.messages[i];

                    // Stable messageId: no real mid from backup, derive from conv+index+timestamp
                    const messageId = `bak_${conv.psid}_${msg.timestamp.getTime()}_${i}`;

                    let fromId = conv.psid;      // customer default
                    let fromName = conv.participantName || 'Unknown';
                    let responderId = null;

                    if (msg.sender.type === 'staff') {
                        fromId = 'PAGE';
                        fromName = msg.sender.staffName || 'Staff';
                        responderId = findEmployeeId(msg.sender.staffName);
                        if (msg.sender.staffName && !responderId) {
                            // Only warn for known staff (not embedded attribution mismatches)
                            if (STAFF_NAMES.has(msg.sender.staffName)) {
                                console.warn(`   !! No employee found for staff "${msg.sender.staffName}"`);
                            }
                        }
                    } else if (msg.sender.type === 'page') {
                        fromId = 'PAGE';
                        fromName = 'The V School';
                    } else if (msg.sender.type === 'customer') {
                        fromId = conv.psid;
                        fromName = msg.sender.customerName || conv.participantName || 'Unknown';
                    }

                    if (!DRY_RUN) {
                        await client.query(`
                            INSERT INTO messages (
                                id, message_id, conversation_id,
                                from_id, from_name, content,
                                has_attachment, attachment_type,
                                responder_id, created_at
                            )
                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
                            ON CONFLICT (message_id) DO NOTHING
                        `, [
                            messageId,
                            convInternalId,
                            fromId,
                            fromName,
                            msg.content,
                            msg.hasAttachment,
                            msg.hasAttachment ? 'image' : null,
                            responderId,
                            msg.timestamp,
                        ]);
                    }

                    totalMsgs++;
                }
            }
        }
    }

    await client.end();

    console.log(`
══════════════════════════════════════
  Import complete${DRY_RUN ? ' (DRY RUN)' : ''}
  Conversations : ${totalConvs}
  Messages      : ${totalMsgs}
  Unique convs  : ${seenConvIds.size}
══════════════════════════════════════`);
}

run().catch(err => {
    console.error('[import-backup-chats] Fatal error:', err);
    process.exit(1);
});
