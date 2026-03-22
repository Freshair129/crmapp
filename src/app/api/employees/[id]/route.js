import { logger }     from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma }    from '@/lib/db';
import bcrypt           from 'bcryptjs';
import { logAction }    from '@/lib/repositories/auditRepo';
import { getServerSession } from 'next-auth';
import { authOptions }  from '@/lib/authOptions';

/**
 * PATCH /api/employees/[id]
 * Update employee fields (firstName, lastName, nickName, phone, department,
 *   role, roles, status, password, facebookName, facebookUrl)
 */
export async function PATCH(req, { params }) {
    try {
        const prisma  = await getPrisma();
        const session = await getServerSession(authOptions);
        const { id }  = params;
        const body    = await req.json();

        // ─── Snapshot before for audit ───────────────────────────
        const before = await prisma.employee.findUnique({
            where:  { id },
            select: { role: true, roles: true, status: true },
        });

        const updateData = {};
        const allowed = [
            'firstName', 'lastName', 'nickName', 'phone', 'department', 'jobTitle',
            'role', 'status', 'facebookName', 'facebookUrl', 'profilePicture', 'grade',
        ];
        for (const key of allowed) {
            if (key in body) updateData[key] = body[key] || null;
        }

        // roles[] — TEXT[] array field, handled separately
        if (Array.isArray(body.roles)) {
            updateData.roles = body.roles.filter(Boolean);
            // Keep primary role in sync: if roles[] is provided and role is not, derive from first element
            if (!('role' in body) && body.roles.length > 0) {
                updateData.role = body.roles[0];
            }
        }

        // hiredAt — date field, handled separately (null = clear, string = parse)
        if ('hiredAt' in body) {
            updateData.hiredAt = body.hiredAt ? new Date(body.hiredAt) : null;
        }

        // dateOfBirth — date field, same pattern as hiredAt
        if ('dateOfBirth' in body) {
            updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
        }

        if (body.password) {
            updateData.passwordHash = await bcrypt.hash(body.password, 10);
        }

        const employee = await prisma.employee.update({
            where: { id },
            data:  updateData,
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
                roles: true,
                status: true,
                facebookName: true,
                facebookUrl: true,
                profilePicture: true,
                grade: true,
                hiredAt: true,
                dateOfBirth: true,
            },
        });

        // ─── Audit: ROLE_CHANGE ───────────────────────────────────
        const roleChanged = before && (
            updateData.role  !== undefined && updateData.role  !== before.role ||
            updateData.roles !== undefined && JSON.stringify(updateData.roles) !== JSON.stringify(before.roles)
        );
        if (roleChanged) {
            logAction({
                actorId:   session?.user?.id ?? null,
                actorEmail: session?.user?.email ?? null,
                action:    'ROLE_CHANGE',
                entity:    'Employee',
                entityId:  id,
                before:    { role: before.role, roles: before.roles },
                after:     { role: employee.role, roles: employee.roles },
                note:      body.note ?? null,
            }).catch(err => logger.error('EmployeeAPI', 'Audit ROLE_CHANGE failed', err));
        }

        // ─── Audit: EMPLOYEE_DEACTIVATE ───────────────────────────
        const deactivated = before?.status === 'ACTIVE' && updateData.status === 'INACTIVE';
        if (deactivated) {
            logAction({
                actorId:    session?.user?.id ?? null,
                actorEmail: session?.user?.email ?? null,
                action:     'EMPLOYEE_DEACTIVATE',
                entity:     'Employee',
                entityId:   id,
                before:     { status: 'ACTIVE' },
                after:      { status: 'INACTIVE' },
                note:       body.note ?? null,
            }).catch(err => logger.error('EmployeeAPI', 'Audit EMPLOYEE_DEACTIVATE failed', err));
        }

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
        const prisma   = await getPrisma();
        const session  = await getServerSession(authOptions);
        const { id }   = params;

        const target = await prisma.employee.findUnique({
            where: { id }, select: { email: true, role: true }
        });

        await prisma.employee.update({
            where: { id },
            data:  { status: 'INACTIVE' },
        });

        logAction({
            actorId:    session?.user?.id ?? null,
            actorEmail: session?.user?.email ?? null,
            action:     'EMPLOYEE_DEACTIVATE',
            entity:     'Employee',
            entityId:   id,
            before:     { status: 'ACTIVE', email: target?.email, role: target?.role },
            after:      { status: 'INACTIVE' },
        }).catch(err => logger.error('EmployeeAPI', 'Audit DELETE failed', err));

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('EmployeeAPI', 'DELETE error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
