import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getPrisma } from '@/lib/db';
import { getScheduleById, updateScheduleStatus } from '@/lib/repositories/scheduleRepo';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
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
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { status, ...rest } = body;

        if (status) {
            const result = await updateScheduleStatus(params.id, status);
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
