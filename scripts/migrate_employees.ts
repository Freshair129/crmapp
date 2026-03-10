import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma-client';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🔄 Migrating employees from old DB → v2...');

    // 1. พรพล / suanranger129@gmail.com (ADMIN) — hash เดิมจาก old DB
    await prisma.employee.upsert({
        where: { email: 'suanranger129@gmail.com' },
        update: {
            role: 'ADMIN',
            status: 'ACTIVE',
            passwordHash: '$2b$10$ST6jvddY0eijSzccQ.raJu1GZAYD5hi8S3ZAb6HxsG6f7mGx09cEe',
        },
        create: {
            employeeId: 'TVS-EMP-2026-0002',
            firstName: 'พรพล',
            lastName: 'ธนสุวรรณธาร',
            nickName: 'พรพล',
            email: 'suanranger129@gmail.com',
            passwordHash: '$2b$10$ST6jvddY0eijSzccQ.raJu1GZAYD5hi8S3ZAb6HxsG6f7mGx09cEe',
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    console.log('✅ suanranger129@gmail.com (ADMIN) migrated');

    // 2. Fafah (AGENT) — password เก่าเป็น plaintext "dummy" → hash ใหม่
    const fahahHash = await bcrypt.hash('dummy', 10);
    await prisma.employee.upsert({
        where: { email: 'fafah@vschool.com' },
        update: {
            role: 'AGENT',
            status: 'ACTIVE',
            passwordHash: fahahHash,
        },
        create: {
            employeeId: 'TVS-EMP-2026-0003',
            firstName: 'Fafah',
            lastName: 'Test',
            nickName: 'Fafah',
            email: 'fafah@vschool.com',
            passwordHash: fahahHash,
            role: 'AGENT',
            status: 'ACTIVE',
        },
    });
    console.log('✅ fafah@vschool.com (AGENT) migrated');

    // แสดงผล employees ทั้งหมดใน v2
    const all = await prisma.employee.findMany({
        select: { employeeId: true, email: true, role: true, status: true, firstName: true },
    });
    console.log('\n📋 Employees ใน v2 DB ทั้งหมด:');
    all.forEach(e => console.log(`  ${e.employeeId}  ${e.email}  [${e.role}]  ${e.status}`));
}

main()
    .then(async () => {
        await prisma.$disconnect();
        await pool.end();
        console.log('\n🚀 Migration complete');
    })
    .catch(async (e) => {
        console.error('❌ Migration failed:', e);
        await prisma.$disconnect();
        await pool.end();
        process.exit(1);
    });
