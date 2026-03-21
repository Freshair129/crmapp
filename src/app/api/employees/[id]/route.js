import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * PATCH /api/employees/[id]
 * Update employee fields (firstName, lastName, nickName, phone, department,
 *   role, status, password, facebookName, facebookUrl)
 */
export async function PATCH(req, { params }) {
    try {
        const prisma = await getPrisma();
        const { id } = params;
        const body = await req.json();

        const updateData = {};
        const allowed = [
            'firstName', 'lastName', 'nickName', 'phone', 'department', 'jobTitle',
            'role', 'status', 'facebookName', 'facebookUrl',
        ];
        for (const key of allowed) {
            if (key in body) updateData[key] = body[key] || null;
        }
        if (body.password) {
            updateData.passwordHash = await bcrypt.hash(body.password, 10);
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                employeeId: true,
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
            },
        });

        return NextResponse.json({ success: true, data: employee });
    } catch (error) {
        logger.error('EmployeeAPI', 'PATCH error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/employees/[id]
 * Soft-delete: set status to INACTIVE
 */
export async function DELETE(req, { params }) {
    try {
        const prisma = await getPrisma();
        const { id } = params;

        await prisma.employee.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('EmployeeAPI', 'DELETE error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
