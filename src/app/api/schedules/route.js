import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getPrisma } from '@/lib/db';
import { getUpcomingSchedules, createSchedule } from '@/lib/repositories/scheduleRepo';

export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const upcoming = searchParams.get('upcoming') === 'true';
        const days = parseInt(searchParams.get('days') || '14', 10);

        if (upcoming) {
            const data = await getUpcomingSchedules(days);
            return NextResponse.json(data);
        }

        const prisma = await getPrisma();
        const data = await prisma.courseSchedule.findMany({
            include: {
                product: { select: { name: true, duration: true, category: true } },
                instructor: { select: { firstName: true, lastName: true, nickName: true } }
            },
            orderBy: { scheduledDate: 'desc' }
        });

        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Schedules]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = await createSchedule(body);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error('[Schedules]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
