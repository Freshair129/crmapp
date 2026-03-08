import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Department code map → TVS-[CODE]-[SERIAL]
const DEPT_CODE = {
    marketing: 'MKT',
    sales: 'SLS',
    admin: 'ADM',
    manager: 'MGR',
    developer: 'DEV',
    support: 'SPT',
};

async function generateEmployeeId(prisma, department) {
    const code = DEPT_CODE[(department || '').toLowerCase()] || 'GEN';
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

/**
 * GET /api/employees - List all employees (all statuses)
 */
export async function GET(req) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get('status');
        const employees = await prisma.employee.findMany({
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                nickName: true,
                email: true,
                phone: true,
                department: true,
                role: true,
                status: true,
                identities: true,
                createdAt: true,
            },
            where: statusFilter ? { status: statusFilter } : {},
            orderBy: { employeeId: 'asc' },
        });
        return NextResponse.json({ success: true, data: employees });
    } catch (error) {
        logger.error('EmployeeAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/employees - Register new employee
 * Body: { firstName, lastName, nickName?, email, phone?, department, role, password }
 */
export async function POST(req) {
    try {
        const prisma = await getPrisma();
        const body = await req.json();
        const { firstName, lastName, nickName, email, phone, department, role, password, facebookName } = body;

        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json(
                { error: 'firstName, lastName, email, password are required' },
                { status: 400 }
            );
        }

        const existing = await prisma.employee.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        const employeeId = await generateEmployeeId(prisma, department);
        const passwordHash = await bcrypt.hash(password, 10);

        const identities = facebookName ? { facebook: { name: facebookName } } : {};

        const employee = await prisma.employee.create({
            data: {
                employeeId,
                firstName,
                lastName,
                nickName: nickName || null,
                email,
                phone: phone || null,
                department: department || null,
                role: role || 'AGENT',
                status: 'ACTIVE',
                passwordHash,
                identities,
            },
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                nickName: true,
                email: true,
                phone: true,
                department: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ success: true, data: employee }, { status: 201 });
    } catch (error) {
        logger.error('EmployeeAPI', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
