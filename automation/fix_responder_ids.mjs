/**
 * fix_responder_ids.mjs
 *
 * One-shot maintenance script: links messages.responder_id to employee UUIDs
 * based on messages.from_name (already set by the FB backfill).
 *
 * Also sets conversations.assigned_agent and conversations.assigned_employee_id
 * for any conversations where admin was the last/only non-customer sender.
 *
 * Run from: /Users/ideab/Desktop/crm
 *   node automation/fix_responder_ids.mjs [--dry-run]
 *
 * --dry-run  shows what would be updated without committing any changes.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a lookup Map from all active employees.
 * Keys: every plausible display-name variant → employee.id
 */
async function buildEmployeeMap() {
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      nickName: true,
      identities: true,
    },
  });

  const map = new Map(); // lowercased name string → { id, displayName }

  for (const e of employees) {
    const displayName = `${e.firstName} ${e.lastName}`.trim();

    // full name
    map.set(displayName.toLowerCase(), { id: e.id, displayName });

    // reversed: "LastName FirstName"
    map.set(`${e.lastName} ${e.firstName}`.toLowerCase(), { id: e.id, displayName });

    // nick name only
    if (e.nickName) {
      map.set(e.nickName.toLowerCase(), { id: e.id, displayName });
      // "NickName LastName"
      map.set(`${e.nickName} ${e.lastName}`.toLowerCase(), { id: e.id, displayName });
    }

    // facebook.name in identities JSONB
    try {
      const identities = typeof e.identities === 'string'
        ? JSON.parse(e.identities)
        : (e.identities ?? {});
      const fbName = identities?.facebook?.name;
      if (fbName) map.set(fbName.toLowerCase(), { id: e.id, displayName });
    } catch (_) {}
  }

  return { map, employees };
}

/**
 * Try to resolve employee by from_name.
 * Strategy: exact full-name → FB name → first-token nick match.
 */
function resolveEmployee(fromName, map) {
  if (!fromName) return null;
  const key = fromName.trim().toLowerCase();
  if (map.has(key)) return map.get(key);

  // partial: check if any map key starts with the from_name tokens
  const tokens = key.split(/\s+/);
  if (tokens.length >= 1) {
    const firstName = tokens[0];
    for (const [k, v] of map.entries()) {
      if (k.startsWith(firstName) || k.split(' ')[0] === firstName) {
        return v;
      }
    }
  }
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧  fix_responder_ids.mjs  [${DRY_RUN ? 'DRY-RUN' : 'LIVE'}]\n`);

  // 1. Build employee map
  const { map: empMap, employees } = await buildEmployeeMap();
  console.log(`👥  ${employees.length} active employee(s) loaded:`);
  for (const e of employees) {
    const fbName = (e.identities?.facebook?.name) || '—';
    console.log(`    ${e.employeeId}  ${e.firstName} ${e.lastName}  (nick=${e.nickName ?? '—'}, fb=${fbName})`);
  }
  console.log();

  // 2. Get all distinct from_name values that have responder_id = NULL
  const rawRows = await prisma.$queryRaw`
    SELECT DISTINCT from_name, COUNT(*) AS cnt
    FROM messages
    WHERE from_name IS NOT NULL
      AND from_name <> ''
      AND responder_id IS NULL
    GROUP BY from_name
    ORDER BY cnt DESC
  `;

  console.log(`📊  Distinct from_name with responder_id=NULL: ${rawRows.length}\n`);

  const matched = [];
  const unmatched = [];

  for (const row of rawRows) {
    const name = row.from_name;
    const count = Number(row.cnt);
    const emp = resolveEmployee(name, empMap);
    if (emp) {
      matched.push({ name, count, emp });
      console.log(`  ✅  "${name}" (${count} msgs) → ${emp.displayName} [${emp.id.slice(0, 8)}…]`);
    } else {
      unmatched.push({ name, count });
      console.log(`  ❓  "${name}" (${count} msgs) → no employee match`);
    }
  }

  console.log(`\n  Matched: ${matched.length}  |  Unmatched: ${unmatched.length}\n`);

  if (matched.length === 0) {
    console.log('⚠️  Nothing to update. Make sure employees exist in the DB first.');
    console.log('   Use POST /api/employees to create them, then re-run this script.');
    if (unmatched.length > 0) {
      console.log('\n   Unmatched admin names found in messages:');
      for (const u of unmatched) console.log(`     - "${u.name}" (${u.count} msgs)`);
    }
    return;
  }

  if (DRY_RUN) {
    console.log('🔍  DRY-RUN: no DB changes made. Re-run without --dry-run to apply.\n');
    return;
  }

  // 3. Bulk update messages.responder_id grouped by employee
  let totalMsgUpdated = 0;
  for (const { name, emp } of matched) {
    const result = await prisma.message.updateMany({
      where: {
        fromName: name,
        responderId: null,
      },
      data: { responderId: emp.id },
    });
    console.log(`  💾  "${name}" → updated ${result.count} message(s) with responderId=${emp.id.slice(0, 8)}…`);
    totalMsgUpdated += result.count;
  }

  console.log(`\n✅  messages.responder_id updated: ${totalMsgUpdated} rows\n`);

  // 4. Update conversation-level assignedAgent + assignedEmployeeId
  //    For conversations that have at least one message with a matched from_name
  console.log('🔄  Syncing conversation-level assignedAgent…');

  // Get distinct (conversationId, from_name) pairs for matched names
  const matchedNames = matched.map(m => m.name);
  const convRows = await prisma.$queryRaw`
    SELECT DISTINCT m.conversation_id, m.from_name
    FROM messages m
    WHERE m.from_name = ANY(${matchedNames}::text[])
  `;

  // Group by conversation_id → list of employee names + IDs
  const convMap = new Map();
  for (const row of convRows) {
    const emp = resolveEmployee(row.from_name, empMap);
    if (!emp) continue;
    if (!convMap.has(row.conversation_id)) {
      convMap.set(row.conversation_id, { names: [], empId: emp.id });
    }
    const entry = convMap.get(row.conversation_id);
    if (!entry.names.includes(emp.displayName)) {
      entry.names.push(emp.displayName);
    }
  }

  let convUpdated = 0;
  for (const [convInternalId, { names, empId }] of convMap.entries()) {
    await prisma.conversation.update({
      where: { id: convInternalId },
      data: {
        assignedAgent: names.join(', '),
        assignedEmployeeId: empId,
      },
    });
    convUpdated++;
  }

  console.log(`✅  conversations.assigned_agent updated: ${convUpdated} rows\n`);

  // 5. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Messages updated   : ${totalMsgUpdated}`);
  console.log(`  Conversations synced: ${convUpdated}`);
  if (unmatched.length > 0) {
    console.log(`\n  ⚠️  Still unmatched (${unmatched.length} name(s)) — create employees for these:`);
    for (const u of unmatched) console.log(`     "${u.name}" — ${u.count} messages`);
    console.log(`\n  ↳  POST /api/employees  { firstName, lastName, email, password, facebookName: "<name>" }`);
    console.log(`     Then re-run this script to pick up the new employees.`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
