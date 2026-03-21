/**
 * setup_employees.mjs
 *
 * Utility script for managing employee records for agent attribution.
 *
 * Usage (from /Users/ideab/Desktop/crm):
 *
 *   # List current employees + show which v6 sender names are unmatched
 *   node automation/setup_employees.mjs --list
 *
 *   # Create a single employee (interactive-style via args)
 *   node automation/setup_employees.mjs --add \
 *     --fb-name "Fafah Fasai" \
 *     --first "Fafah" --last "Fasai" \
 *     --email "fafah@vschool.co.th" \
 *     --dept marketing --role AGENT
 *
 *   # Bulk-create placeholder employees for ALL unmatched v6 sender names
 *   # (uses fb_name as email placeholder — update real emails later)
 *   node automation/setup_employees.mjs --seed-unmatched
 *
 *   # Set the facebook identity name for an existing employee
 *   node automation/setup_employees.mjs --link-fb \
 *     --employee-id TVS-MKT-001 --fb-name "Fafah Fasai"
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

// ─── Known sender names from sync_agents_v6 ─────────────────────────────────
// Update this list as more runs complete.
const KNOWN_ADMIN_NAMES = [
  'Apwts Balso',
  'DM Atom',
  'Fafah Fasai',
  "Jutamat Fah N'Finn Sangprakai",
  'Mascot Vschool',
  'Nanchat Saimai',
  'Narongkorn Luathanaya',
  'Nuwat Chalerm-adirek',
  'Panxei',
  'Pat Panaram',
  'Preeyaporn NuPhung Kornvathin',
  'Satabongkot Noinin',
  'Time Natepatn',
  'กระต่าย ตำยา',
  'พรพล ธนสุวรรณธาร',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFbName(fbName) {
  // Attempt to split "First Last" or use full name as firstName
  const parts = fbName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  return { firstName: fbName.trim(), lastName: '—' };
}

async function buildEmpMap() {
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, employeeId: true, firstName: true, lastName: true, nickName: true, identities: true },
  });

  const map = new Map();
  for (const e of employees) {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    map.set(fullName, e);
    if (e.nickName) map.set(e.nickName.toLowerCase(), e);
    try {
      const id = typeof e.identities === 'string' ? JSON.parse(e.identities) : (e.identities ?? {});
      if (id?.facebook?.name) map.set(id.facebook.name.toLowerCase(), e);
    } catch (_) {}
  }
  return { employees, map };
}

async function getNextEmployeeId(prisma, dept) {
  const codes = { marketing: 'MKT', sales: 'SLS', admin: 'ADM', manager: 'MGR', developer: 'DEV', support: 'SPT' };
  const code = codes[(dept || '').toLowerCase()] || 'GEN';
  const prefix = `TVS-${code}-`;
  const latest = await prisma.employee.findFirst({
    where: { employeeId: { startsWith: prefix } },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true },
  });
  const serial = latest
    ? String(parseInt(latest.employeeId.split('-')[2] || '0', 10) + 1).padStart(3, '0')
    : '001';
  return `${prefix}${serial}`;
}

// Deterministic placeholder password hash (not secure — admin must reset)
function placeholderHash(fbName) {
  return createHash('sha256').update(`placeholder-${fbName}`).digest('hex').slice(0, 60);
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdList() {
  const { employees, map } = await buildEmpMap();
  console.log(`\n👥  Employees (${employees.length}):\n`);
  for (const e of employees) {
    const fbName = (typeof e.identities === 'object' ? e.identities?.facebook?.name : null) || '—';
    console.log(`  ${e.employeeId}  ${e.firstName} ${e.lastName}  nick=${e.nickName ?? '—'}  fb="${fbName}"`);
  }

  console.log(`\n📊  v6 sender name matching:\n`);
  let matchCount = 0;
  for (const name of KNOWN_ADMIN_NAMES) {
    const emp = map.get(name.toLowerCase());
    if (emp) {
      console.log(`  ✅  "${name}" → ${emp.employeeId}`);
      matchCount++;
    } else {
      console.log(`  ❌  "${name}" → NOT in employees`);
    }
  }
  console.log(`\n  Matched ${matchCount}/${KNOWN_ADMIN_NAMES.length} admin names\n`);
  if (matchCount < KNOWN_ADMIN_NAMES.length) {
    console.log('  ↳  Run with --seed-unmatched to create placeholder records');
    console.log('     OR use --add --fb-name "..." --first "..." --last "..." --email "..." to add individually\n');
  }
}

async function cmdAdd(args) {
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const fbName = get('--fb-name');
  const first = get('--first');
  const last = get('--last');
  const email = get('--email');
  const dept = get('--dept') || 'marketing';
  const role = get('--role') || 'AGENT';

  if (!fbName || !first || !last || !email) {
    console.error('Required: --fb-name, --first, --last, --email');
    process.exit(1);
  }

  const existing = await prisma.employee.findFirst({
    where: {
      OR: [
        { email },
        { identities: { path: ['facebook', 'name'], equals: fbName } },
      ],
    },
  });
  if (existing) {
    console.log(`⚠️  Employee already exists: ${existing.employeeId} — ${existing.firstName} ${existing.lastName}`);
    return;
  }

  const employeeId = await getNextEmployeeId(prisma, dept);
  const emp = await prisma.employee.create({
    data: {
      employeeId,
      firstName: first,
      lastName: last,
      email,
      department: dept,
      role,
      status: 'ACTIVE',
      passwordHash: placeholderHash(fbName),
      identities: { facebook: { name: fbName } },
    },
    select: { id: true, employeeId: true, firstName: true, lastName: true },
  });
  console.log(`✅  Created: ${emp.employeeId}  ${emp.firstName} ${emp.lastName}  [${emp.id}]`);
}

async function cmdSeedUnmatched() {
  const { map } = await buildEmpMap();
  let created = 0;

  for (const name of KNOWN_ADMIN_NAMES) {
    if (map.has(name.toLowerCase())) {
      console.log(`  ⏩  "${name}" — already exists, skip`);
      continue;
    }

    const { firstName, lastName } = parseFbName(name);
    // Placeholder email: lowercase slug of fb name
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/, '');
    const email = `${slug}@vschool-placeholder.internal`;

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ⏩  "${name}" — placeholder email exists, skip`);
      continue;
    }

    const employeeId = await getNextEmployeeId(prisma, 'marketing');
    const emp = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        department: 'marketing',
        role: 'AGENT',
        status: 'ACTIVE',
        passwordHash: placeholderHash(name),
        identities: { facebook: { name } },
      },
      select: { id: true, employeeId: true, firstName: true, lastName: true },
    });
    console.log(`  ✅  Created: ${emp.employeeId}  ${emp.firstName} ${emp.lastName}  (fb="${name}")`);
    created++;
  }

  console.log(`\n  Done — created ${created} new employee(s).`);
  console.log(`  ↳  Now run: node automation/fix_responder_ids.mjs\n`);
}

async function cmdLinkFb(args) {
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const empId = get('--employee-id');
  const fbName = get('--fb-name');
  if (!empId || !fbName) { console.error('Required: --employee-id, --fb-name'); process.exit(1); }

  const emp = await prisma.employee.findUnique({ where: { employeeId: empId } });
  if (!emp) { console.error(`Employee not found: ${empId}`); process.exit(1); }

  const current = (typeof emp.identities === 'object' ? emp.identities : {}) ?? {};
  const updated = await prisma.employee.update({
    where: { employeeId: empId },
    data: { identities: { ...current, facebook: { ...(current.facebook ?? {}), name: fbName } } },
    select: { employeeId: true, firstName: true, lastName: true },
  });
  console.log(`✅  Linked "${fbName}" → ${updated.employeeId} ${updated.firstName} ${updated.lastName}`);
}

// ─── Entry ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

async function main() {
  if (args.includes('--list') || args.length === 0) {
    await cmdList();
  } else if (args.includes('--add')) {
    await cmdAdd(args);
  } else if (args.includes('--seed-unmatched')) {
    console.log('\n🌱  Seeding placeholder employees for unmatched admin names…\n');
    await cmdSeedUnmatched();
  } else if (args.includes('--link-fb')) {
    await cmdLinkFb(args);
  } else {
    console.log('Unknown command. Use --list | --add | --seed-unmatched | --link-fb');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
