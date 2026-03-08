/**
 * Migration: v1 JSON profiles + CSV leads → Supabase (v2)
 * Run: node scripts/migrate-v1-to-supabase.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';

const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'postgresql://postgres.qcxjallsoccqsgmrpqdz:Suanranger1295@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';
const CUSTOMER_DIR = 'E:/data_hub/customer';
const CSV_DIR      = 'E:/data_hub/leads-2026';

// ── Helpers ───────────────────────────────────────────────────────────────────
function tierMap(t) {
    const m = { GENERAL: 'MEMBER', MEMBER: 'MEMBER', SILVER: 'SILVER', GOLD: 'GOLD', PLATINUM: 'PLATINUM', DIAMOND: 'DIAMOND' };
    return m[(t || '').toUpperCase()] || 'MEMBER';
}

function stageMap(s) {
    const m = {
        'มาใหม่': 'Lead', 'Lead': 'Lead',
        'In Progress': 'InProgress', 'กำลังดำเนินการ': 'InProgress',
        'Purchased': 'Customer', 'ซื้อแล้ว': 'Customer',
        'Inactive': 'Churned',
    };
    return m[s] || s || 'Lead';
}

function parseCSVLine(line) {
    // Handle quoted fields with commas inside
    const result = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
        else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
}

const summary = {};
let db;

async function run() {
    db = new Client({ connectionString: SUPABASE_URL });
    await db.connect();
    console.log('✅ Connected to Supabase\n');

    await migrateProfileJSON();
    await migrateCSVLeads();

    await db.end();
    printSummary();
}

// ── 1. Profile JSON → customers + timeline_events + inventory_items ───────────
async function migrateProfileJSON() {
    console.log('── Profile JSONs ──────────────────────────────────────');

    if (!existsSync(CUSTOMER_DIR)) {
        console.log('⚠️  Customer dir not found:', CUSTOMER_DIR);
        return;
    }

    const dirs = readdirSync(CUSTOMER_DIR);
    let inserted = 0, skipped = 0, errors = 0;
    let tlInserted = 0, invInserted = 0;

    for (const dir of dirs) {
        const jsonFile = join(CUSTOMER_DIR, dir, `profile_${dir}.json`);
        if (!existsSync(jsonFile)) continue;

        try {
            const raw = JSON.parse(readFileSync(jsonFile, 'utf8'));
            const p = raw.profile || {};
            const c = raw.contact_info || {};
            const intel = raw.intelligence || {};
            const wallet = raw.wallet || {};

            const facebookId = c.facebook_id ? String(c.facebook_id) : null;
            const customerId = raw.customer_id || `TVS-CUS-FB-26-${randomUUID().slice(0,4).toUpperCase()}`;
            const uuid = randomUUID();

            // Upsert customer
            const res = await db.query(`
                INSERT INTO customers (
                    id, customer_id, member_id, status,
                    first_name, last_name, nick_name,
                    membership_tier, lifecycle_stage, join_date,
                    facebook_id, facebook_name,
                    wallet_balance, wallet_points, wallet_currency,
                    intelligence, conversation_id,
                    created_at, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())
                ON CONFLICT (customer_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    lifecycle_stage = EXCLUDED.lifecycle_stage,
                    intelligence = EXCLUDED.intelligence,
                    updated_at = NOW()
                RETURNING id, (xmax = 0) AS is_insert
            `, [
                uuid,
                customerId,
                p.member_id || null,
                p.status || 'Active',
                p.first_name || null,
                p.last_name || null,
                p.nick_name || null,
                tierMap(p.membership_tier),
                stageMap(p.lifecycle_stage),
                p.join_date ? new Date(p.join_date) : null,
                facebookId,
                c.facebook || null,
                wallet.balance || 0,
                wallet.points || 0,
                wallet.currency || 'THB',
                JSON.stringify(intel),
                raw.conversation_id || null,
            ]);

            const customersRowId = res.rows[0].id;
            const wasInsert = res.rows[0].is_insert;
            if (wasInsert) inserted++; else skipped++;

            // Timeline events
            for (const evt of (raw.timeline || [])) {
                try {
                    await db.query(`
                        INSERT INTO timeline_events (id, event_id, customer_id, date, type, summary, details, created_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
                        ON CONFLICT DO NOTHING
                    `, [
                        randomUUID(),
                        evt.id || evt.event_id || randomUUID(),
                        customersRowId,
                        evt.date ? new Date(evt.date) : new Date(),
                        evt.type || 'NOTE',
                        evt.summary || evt.type || '',
                        JSON.stringify(evt.details || {}),
                    ]);
                    tlInserted++;
                } catch { /* skip duplicate */ }
            }

            // Inventory items (learning courses)
            for (const course of (raw.inventory?.learning_courses || [])) {
                try {
                    await db.query(`
                        INSERT INTO inventory_items (id, customer_id, type, item_id, name, enroll_date, expiry_date, status, metadata, created_at)
                        VALUES ($1,$2,'course',$3,$4,$5,$6,$7,$8,NOW())
                        ON CONFLICT DO NOTHING
                    `, [
                        randomUUID(),
                        customersRowId,
                        course.id || course.product_id || randomUUID(),
                        course.name || 'Unknown Course',
                        course.enroll_date ? new Date(course.enroll_date) : null,
                        course.expiry_date ? new Date(course.expiry_date) : null,
                        course.status || 'ACTIVE',
                        JSON.stringify(course.metadata || {}),
                    ]);
                    invInserted++;
                } catch { /* skip */ }
            }

        } catch (err) {
            console.error(`  ✗ ${dir}: ${err.message}`);
            errors++;
        }
    }

    summary['customers (JSON)']      = { inserted, skipped, errors };
    summary['timeline_events']       = { inserted: tlInserted };
    summary['inventory_items']       = { inserted: invInserted };
    console.log(`  customers: +${inserted} inserted, ${skipped} updated, ${errors} errors`);
    console.log(`  timeline_events: +${tlInserted}`);
    console.log(`  inventory_items: +${invInserted}\n`);
}

// ── 2. CSV Leads → customers (upsert by name if no facebookId) ────────────────
async function migrateCSVLeads() {
    console.log('── CSV Leads ───────────────────────────────────────────');

    const files = [`${CSV_DIR}/leads_2026-jan.csv`, `${CSV_DIR}/leads_2026-feb.csv`];
    let inserted = 0, skipped = 0, errors = 0;

    for (const filePath of files) {
        if (!existsSync(filePath)) { console.log('  ⚠️  Not found:', filePath); continue; }

        const lines = readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
        const header = parseCSVLine(lines[0]);

        // Column indices
        const iDate    = header.findIndex(h => h.includes('สร้างเมื่อ') || h.includes('Created'));
        const iName    = header.findIndex(h => h.includes('ชื่อ') || h.toLowerCase() === 'name');
        const iStage   = header.findIndex(h => h.includes('ระยะ') || h.toLowerCase().includes('stage'));
        const iOwner   = header.findIndex(h => h.includes('เจ้าของ') || h.toLowerCase().includes('owner'));
        const iLabels  = header.findIndex(h => h.includes('ป้ายกำกับ') || h.toLowerCase().includes('label'));
        const iPhone   = header.findIndex(h => h.includes('โทรศัพท์') && !h.includes('รอง'));

        for (const line of lines.slice(1)) {
            if (!line.trim()) continue;
            const cols = parseCSVLine(line);
            const name = cols[iName]?.trim();
            if (!name) continue;

            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0] || name;
            const lastName  = nameParts.slice(1).join(' ') || null;
            const labels    = (cols[iLabels] || '').split(',').map(l => l.trim()).filter(Boolean);
            const adIds     = labels.filter(l => l.startsWith('ad_id.')).map(l => l.replace('ad_id.', ''));
            const phone     = cols[iPhone]?.trim() || null;
            const joinDate  = cols[iDate] ? new Date(cols[iDate]) : new Date();
            const customerId = `TVS-CUS-FB-26-${randomUUID().slice(-4).toUpperCase()}`;

            try {
                const res = await db.query(`
                    INSERT INTO customers (
                        id, customer_id, status, first_name, last_name,
                        membership_tier, lifecycle_stage, join_date,
                        phone_primary, intelligence,
                        created_at, updated_at
                    ) VALUES ($1,$2,'Active',$3,$4,'MEMBER',$5,$6,$7,$8,NOW(),NOW())
                    ON CONFLICT DO NOTHING
                    RETURNING id
                `, [
                    randomUUID(),
                    customerId,
                    firstName,
                    lastName,
                    stageMap(cols[iStage] || 'Lead'),
                    joinDate,
                    phone,
                    JSON.stringify({
                        tags: labels.filter(l => !l.startsWith('ad_id.')),
                        attribution: adIds.length ? { ad_ids: adIds } : {},
                        source: { channel: 'Facebook', owner: cols[iOwner]?.trim() || 'Unassigned' },
                    }),
                ]);
                if (res.rows.length > 0) inserted++; else skipped++;
            } catch (err) {
                errors++;
                console.error(`  ✗ ${name}: ${err.message}`);
            }
        }
    }

    summary['customers (CSV)'] = { inserted, skipped, errors };
    console.log(`  inserted: ${inserted}, skipped (duplicate): ${skipped}, errors: ${errors}\n`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
    console.log('══════════════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('══════════════════════════════════════════════');
    for (const [table, stats] of Object.entries(summary)) {
        const parts = Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(', ');
        console.log(`  ${table.padEnd(25)} ${parts}`);
    }
    console.log('══════════════════════════════════════════════');
}

run().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
