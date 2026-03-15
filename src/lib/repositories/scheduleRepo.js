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

        const rows = await prisma.courseSchedule.findMany({
            where: {
                scheduledDate: { gte: now, lte: endDate },
                status: { in: ['OPEN', 'FULL'] }
            },
            include: {
                product: { select: { name: true, duration: true, days: true } },
                instructor: { select: { firstName: true, lastName: true, nickName: true } }
            },
            orderBy: { scheduledDate: 'asc' }
        });

        return rows.map(s => ({
            ...s,
            productName: s.product?.name ?? '',
            instructorName: s.instructor
                ? (s.instructor.nickName || `${s.instructor.firstName ?? ''} ${s.instructor.lastName ?? ''}`.trim())
                : '',
        }));
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

/**
 * Complete a session and deduct stock from ingredients + recipe equipment.
 * Phase 16: Real-time stock deduction when session is marked COMPLETED.
 * @param {string} id - CourseSchedule UUID
 * @param {number} studentCount - Actual number of students in session
 */
export async function completeSessionWithStockDeduction(id, studentCount) {
    try {
        const prisma = await getPrisma();

        // Load schedule + product + course menus → recipes → ingredients + equipment
        const schedule = await prisma.courseSchedule.findUnique({
            where: { id },
            include: {
                product: {
                    include: {
                        courseMenus: {
                            include: {
                                recipe: {
                                    include: {
                                        ingredients: true,
                                        equipment: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!schedule) throw new Error('Schedule not found');
        if (schedule.status === 'COMPLETED') throw new Error('Session already completed');
        if (schedule.status === 'CANCELLED') throw new Error('Cannot complete a cancelled session');

        const count = Number(studentCount) || schedule.confirmedStudents || 1;

        return prisma.$transaction(async (tx) => {
            // Collect all deductions
            const ingredientDeductions = new Map(); // ingredientId → totalQty
            const equipmentDeductions = []; // { id, qtyRequired }

            for (const menu of schedule.product.courseMenus) {
                const { recipe } = menu;

                // Ingredients: qty = qtyPerPerson × studentCount
                for (const ri of recipe.ingredients) {
                    const total = ri.qtyPerPerson * count;
                    ingredientDeductions.set(
                        ri.ingredientId,
                        (ingredientDeductions.get(ri.ingredientId) || 0) + total
                    );
                }

                // Special equipment: deduct qtyRequired (not per-person — equipment is per session)
                for (const eq of recipe.equipment) {
                    equipmentDeductions.push({ id: eq.id, qtyRequired: eq.qtyRequired });
                }
            }

            // Deduct ingredients
            for (const [ingredientId, totalQty] of ingredientDeductions) {
                await tx.ingredient.update({
                    where: { id: ingredientId },
                    data: { currentStock: { decrement: totalQty } }
                });
            }

            // Deduct recipe equipment stock
            for (const eq of equipmentDeductions) {
                await tx.recipeEquipment.update({
                    where: { id: eq.id },
                    data: { currentStock: { decrement: eq.qtyRequired } }
                });
            }

            // Mark schedule as COMPLETED
            const updated = await tx.courseSchedule.update({
                where: { id },
                data: { status: 'COMPLETED' },
                include: {
                    product: { select: { name: true } },
                    instructor: { select: { nickName: true } }
                }
            });

            logger.info('[ScheduleRepo]', `Session ${schedule.scheduleId} completed — deducted stock for ${count} students, ${ingredientDeductions.size} ingredients, ${equipmentDeductions.length} equipment items`);
            return { schedule: updated, ingredientsDeducted: ingredientDeductions.size, equipmentDeducted: equipmentDeductions.length, studentCount: count };
        });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to complete session with stock deduction', error);
        throw error;
    }
}
