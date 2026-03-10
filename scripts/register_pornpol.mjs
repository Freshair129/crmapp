/*
 * Script to register a new admin employee: Pornpol Thanasuwanthar
 * Run: node scripts/register_pornpol.mjs
 */

import { PrismaClient } from '../src/generated/prisma-client/index.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function run() {
    const data = {
        email: 'suanranger129@gmail.com',
        password: '041287878',
        firstName: 'พรพล',
        lastName: 'ธนสุวรรณธาร',
        phone: '0909730775',
        department: 'developer',
        role: 'ADMIN',
        status: 'ACTIVE'
    };

    console.log(`🚀 Registering employee: ${data.firstName} <${data.email}>`);

    try {
        // Step 1: Check if already exists
        const existing = await prisma.employee.findUnique({
            where: { email: data.email }
        });

        if (existing) {
            console.log('⚠️  Employee already exists. Updating password only.');
            const newHash = await bcrypt.hash(data.password, 10);
            await prisma.employee.update({
                where: { email: data.email },
                data: { passwordHash: newHash }
            });
            console.log('✅ Password updated successfully.');
            return;
        }

        // Step 2: Generate Employee ID
        // Logic similar to src/app/api/employees/route.js
        const latest = await prisma.employee.findFirst({
            where: { employeeId: { startsWith: 'TVS-DEV-' } },
            orderBy: { employeeId: 'desc' },
            select: { employeeId: true },
        });

        const serial = latest
            ? String(parseInt(latest.employeeId.split('-')[2] || '129', 10) + 1).padStart(3, '0')
            : '129'; // Use 129 as the starting serial for the owner

        const employeeId = `TVS-DEV-${serial}`;

        // Step 3: Hash Password
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Step 4: Create record
        const employee = await prisma.employee.create({
            data: {
                employeeId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                department: data.department,
                role: data.role,
                status: data.status,
                passwordHash,
                permissions: ['all'],
                identities: {
                    birthday: '1993-07-12'
                }
            }
        });

        console.log('✅ Employee created successfully!');
        console.log('-----------------------------------');
        console.log(`ID: ${employee.id}`);
        console.log(`Employee ID: ${employee.employeeId}`);
        console.log(`Email: ${employee.email}`);
        console.log(`Role: ${employee.role}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('❌ Error during registration:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

run();
