import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getPrisma } from '@/lib/db';
import { getScheduleById, updateScheduleStatus } from '@/lib/repositories/scheduleRepo';
import { logAction } from '@/lib/repositories/auditRepo';

export async function GET(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const data = await getScheduleById(params.id);
        if (!data) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Schedules]', 'GET by ID failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { status, ...rest } = body;

        if (status) {
            const prev = await getScheduleById(params.id);
            const result = await updateScheduleStatus(params.id, status);
            // Audit log — fire-and-forget, ไม่ block response
            logAction({
                action: 'UPDATE_SCHEDULE_STATUS',
                entity: 'CourseSchedule',
                entityId: params.id,
                actorId: session.user?.id ?? session.user?.employeeId ?? 'unknown',
                details: {
                    scheduleId: params.id,
                    productName: prev?.product?.name ?? '',
                    scheduledDate: prev?.scheduledDate,
                    prevStatus: prev?.status,
                    newStatus: status,
                },
            }).catch(e => logger.error('[Schedules]', 'audit log failed', e));
            return NextResponse.json(result);
        }

        // Update other fields (startTime, endTime, maxStudents, notes, instructorId)
        const prisma = await getPrisma();
        const result = await prisma.courseSchedule.update({
            where: { id: params.id },
            data: rest,
            include: {
                product: { select: { name: true } },
                instructor: { select: { firstName: true, lastName: true, nickName: true } }
            }
        });

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Schedules]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const prisma = await getPrisma();
        const prev = await getScheduleById(params.id);

        // Hard-delete the schedule row
        await prisma.courseSchedule.delete({ where: { id: params.id } });

        // Audit log
        logAction({
            action: 'DELETE_SCHEDULE',
            entity: 'CourseSchedule',
            entityId: params.id,
            actorId: session.user?.id ?? session.user?.employeeId ?? 'unknown',
            details: {
                scheduleId: params.id,
                productName: prev?.product?.name ?? '',
                scheduledDate: prev?.scheduledDate,
                status: prev?.status,
            },
        }).catch(e => logger.error('[Schedules]', 'delete audit log failed', e));

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[Schedules]', 'DELETE failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
