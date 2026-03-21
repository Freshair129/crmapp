import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { generateEmployeeId, generateAgentId } from '@/lib/idGenerators';
import bcrypt from 'bcryptjs';

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
                agentId: true,
                agentCode: true,
                firstName: true,
                lastName: true,
                nickName: true,
                email: true,
                phone: true,
                department: true,
                jobTitle: true,
                role: true,
                status: true,
                facebookName: true,
                facebookUrl: true,
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
 * Body: { firstName, lastName, nickName?, email, phone?, department, role, password, facebookName?, facebookUrl? }
 */
export async function POST(req) {
    try {
        const prisma = await getPrisma();
        const body = await req.json();
        const { firstName, lastName, nickName, email, phone, department, jobTitle, role, password, facebookName, facebookUrl, employmentType, agentCode, agentType } = body;

        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json(
                { error: 'firstName, lastName, email, password are required' },
                { status: 400 }
            );
        }

        if (!agentCode || agentCode.length < 3 || agentCode.length > 4) {
            return NextResponse.json(
                { error: 'agentCode ต้องเป็น 3-4 ตัวอักษร (เช่น AOI, FAH)' },
                { status: 400 }
            );
        }

        const existing = await prisma.employee.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        const existingCode = await prisma.employee.findUnique({ where: { agentCode: agentCode.toUpperCase() } });
        if (existingCode) {
            return NextResponse.json({ error: `Agent code "${agentCode.toUpperCase()}" ถูกใช้แล้ว` }, { status: 409 });
        }

        const employeeId = await generateEmployeeId(department, employmentType);
        const agentId = await generateAgentId(agentType);
        const passwordHash = await bcrypt.hash(password, 10);

        const employee = await prisma.employee.create({
            data: {
                employeeId,
                agentId,
                agentCode: agentCode.toUpperCase(),
                firstName,
                lastName,
                nickName: nickName || null,
                email,
                phone: phone || null,
                department: department || null,
                jobTitle: jobTitle || null,
                role: role || 'AGENT',
                status: 'ACTIVE',
                passwordHash,
                facebookName: facebookName || null,
                facebookUrl: facebookUrl || null,
            },
            select: {
                id: true,
                employeeId: true,
                agentId: true,
                agentCode: true,
                firstName: true,
                lastName: true,
                nickName: true,
                email: true,
                phone: true,
                department: true,
                jobTitle: true,
                role: true,
                status: true,
                facebookName: true,
                facebookUrl: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ success: true, data: employee }, { status: 201 });
    } catch (error) {
        logger.error('EmployeeAPI', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
