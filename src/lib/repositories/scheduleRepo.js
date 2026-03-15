import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

async function generateScheduleId() {
    const prisma = await getPrisma();
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');
    const prefix = `SCH-${dateStr}-`;
    const last = await prisma.courseSchedule.findFirst({
        where: { scheduleId: { startsWith: prefix } },
        orderBy: { scheduleId: 'desc' }
    });
    const nextSerial = last ? parseInt(last.scheduleId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${nextSerial.toString().padStart(3, '0')}`;
}

export async function createSchedule({ productId, scheduledDate, startTime, endTime, maxStudents, instructorId, notes }) {
    try {
        const prisma = await getPrisma();
        const scheduleId = await generateScheduleId();
        return prisma.courseSchedule.create({
            data: { scheduleId, productId, scheduledDate: new Date(scheduledDate), startTime, endTime, maxStudents, instructorId, notes, status: 'OPEN' },
            include: {
                product: true,
                instructor: { select: { firstName: true, lastName: true, nickName: true } }
            }
        });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to create schedule', error);
        throw error;
    }
}

export async function getUpcomingSchedules(days = 14) {
    try {
        const prisma = await getPrisma();
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + days);

        return prisma.courseSchedule.findMany({
            where: {
                scheduledDate: { gte: now, lte: endDate },
                status: { in: ['OPEN', 'FULL'] }
            },
            include: {
                product: { select: { name: true, duration: true } },
                instructor: { select: { firstName: true, lastName: true, nickName: true } }
            },
            orderBy: { scheduledDate: 'asc' }
        });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to get upcoming schedules', error);
        throw error;
    }
}

export async function getScheduleById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.courseSchedule.findUnique({
            where: { id },
            include: {
                product: true,
                instructor: { select: { firstName: true, lastName: true, nickName: true } },
                _count: { select: { attendances: true } }
            }
        });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to get schedule by ID', error);
        throw error;
    }
}

export async function updateScheduleStatus(id, status) {
    try {
        const VALID = ['OPEN', 'FULL', 'CANCELLED', 'COMPLETED'];
        if (!VALID.includes(status)) throw new Error(`Invalid status: ${status}`);
        const prisma = await getPrisma();
        return prisma.courseSchedule.update({ where: { id }, data: { status } });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to update schedule status', error);
        throw error;
    }
}
