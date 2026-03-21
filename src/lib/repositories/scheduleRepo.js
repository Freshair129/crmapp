import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateScheduleId, generateClassId } from '@/lib/idGenerators';

// generateScheduleId, generateClassId — moved to @/lib/idGenerators

export async function createSchedule({ productId, scheduledDate, startTime, endTime, maxStudents, instructorId, notes, classId }) {
    try {
        const prisma = await getPrisma();
        const scheduleId = await generateScheduleId();
        return prisma.courseSchedule.create({
            data: { scheduleId, productId, scheduledDate: new Date(scheduledDate), startTime, endTime, maxStudents, instructorId, notes, classId: classId ?? null, status: 'OPEN' },
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

export async function getSchedulesByClass(classId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseSchedule.findMany({
            where: { classId },
            include: {
                product: { select: { name: true, duration: true, days: true } },
                instructor: { select: { firstName: true, lastName: true, nickName: true } },
                _count: { select: { attendances: true } }
            },
            orderBy: { scheduledDate: 'asc' }
        });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to get schedules by class', error);
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
 * FEFO (First Expired, First Out) deduction from IngredientLot.
 * Consumes lots in expiry-date order (nulls last = no-expiry lots used last).
 * Returns array of { lotId, qtyDeducted } for audit log entries.
 * @param {object} tx - Prisma transaction client
 * @param {string} ingredientId - Ingredient UUID
 * @param {number} qtyNeeded - Total quantity to deduct (in ingredient's unit)
 */
async function fefoDeductFromLots(tx, ingredientId, qtyNeeded) {
    const lots = await tx.ingredientLot.findMany({
        where: { ingredientId, status: 'ACTIVE', remainingQty: { gt: 0 } },
        orderBy: [
            { expiresAt: { sort: 'asc', nulls: 'last' } },
            { receivedAt: 'asc' }
        ]
    });

    let remaining = qtyNeeded;
    const lotDeductions = [];

    for (const lot of lots) {
        if (remaining <= 0) break;
        const deduct = Math.min(lot.remainingQty, remaining);
        const newQty = +(lot.remainingQty - deduct).toFixed(6);
        await tx.ingredientLot.update({
            where: { id: lot.id },
            data: {
                remainingQty: newQty,
                status: newQty <= 0 ? 'CONSUMED' : 'ACTIVE'
            }
        });
        lotDeductions.push({ lotId: lot.lotId, qtyDeducted: deduct });
        remaining -= deduct;
    }

    return lotDeductions;
}

/**
 * Complete a session and deduct stock from ingredients + recipe equipment.
 * Phase 16: Real-time stock deduction when session is marked COMPLETED.
 * Phase 21: FEFO deduction from IngredientLot + lotId written to StockDeductionLog.
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
                                        ingredients: {
                                            include: { ingredient: { select: { name: true } } }
                                        },
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
            // ingredientId → { totalQty, name, unit }
            const ingredientDeductions = new Map();
            // { id, qtyRequired, name }
            const equipmentDeductions = [];

            for (const menu of schedule.product.courseMenus) {
                const { recipe } = menu;

                // Ingredients: qty = qtyPerPerson × studentCount × conversionFactor (Phase 19)
                for (const ri of recipe.ingredients) {
                    const factor = ri.conversionFactor ?? 1;
                    const total = ri.qtyPerPerson * count * factor;
                    const existing = ingredientDeductions.get(ri.ingredientId);
                    ingredientDeductions.set(ri.ingredientId, {
                        totalQty: (existing?.totalQty || 0) + total,
                        name: ri.ingredient?.name ?? ri.ingredientId,
                        unit: ri.unit,
                    });
                }

                // Equipment: deduct qtyRequired per session (not per-person)
                for (const eq of recipe.equipment) {
                    equipmentDeductions.push({ id: eq.id, qtyRequired: eq.qtyRequired, name: eq.name, unit: eq.unit });
                }
            }

            // Deduct ingredients: update Ingredient.currentStock + FEFO from IngredientLot
            const logEntries = [];

            for (const [ingredientId, { totalQty, name, unit }] of ingredientDeductions) {
                // Always keep Ingredient.currentStock in sync
                await tx.ingredient.update({
                    where: { id: ingredientId },
                    data: { currentStock: { decrement: totalQty } }
                });

                // Phase 21: FEFO deduction from registered lots
                const lotDeductions = await fefoDeductFromLots(tx, ingredientId, totalQty);
                const deductedFromLots = lotDeductions.reduce((sum, d) => sum + d.qtyDeducted, 0);
                const remainder = +(totalQty - deductedFromLots).toFixed(6);

                // Log all lot-specific deductions
                for (const { lotId, qtyDeducted } of lotDeductions) {
                    logEntries.push({ scheduleId: schedule.scheduleId, ingredientId, itemName: name, qtyDeducted, unit, studentCount: count, lotId });
                }

                // If lots were insufficient or missing, log the remainder without lotId
                if (remainder > 0.000001) {
                    logEntries.push({ scheduleId: schedule.scheduleId, ingredientId, itemName: name, qtyDeducted: remainder, unit, studentCount: count });
                }
            }

            // Deduct recipe equipment stock
            for (const eq of equipmentDeductions) {
                await tx.recipeEquipment.update({
                    where: { id: eq.id },
                    data: { currentStock: { decrement: eq.qtyRequired } }
                });
                logEntries.push({ scheduleId: schedule.scheduleId, equipmentId: eq.id, itemName: eq.name, qtyDeducted: eq.qtyRequired, unit: eq.unit, studentCount: count });
            }

            // Write audit log
            if (logEntries.length > 0) {
                await tx.stockDeductionLog.createMany({ data: logEntries });
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

            const lotCount = logEntries.filter(e => e.lotId).length;
            logger.info('[ScheduleRepo]', `Session ${schedule.scheduleId} completed — deducted stock for ${count} students, ${ingredientDeductions.size} ingredients (${lotCount} lot entries), ${equipmentDeductions.length} equipment items`);
            return { schedule: updated, ingredientsDeducted: ingredientDeductions.size, equipmentDeducted: equipmentDeductions.length, studentCount: count };
        });
    } catch (error) {
        logger.error('[ScheduleRepo]', 'Failed to complete session with stock deduction', error);
        throw error;
    }
}
