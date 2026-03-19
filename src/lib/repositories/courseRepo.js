import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ──────────────────────────────────────────
// ID generation
// ──────────────────────────────────────────

/**
 * Auto-generate a human-readable product ID.
 * category='package' → PRD-PKG-YYYY-XXX
 * everything else   → PRD-CRS-YYYY-XXX
 *
 * Exported so sync-master-data route can call it when
 * the Google Sheet row does not have a productId yet.
 */
export async function generateProductId(category = 'course') {
    const prisma = await getPrisma();
    const yyyy = String(new Date().getFullYear());
    const type = category === 'package' ? 'PKG' : 'CRS';
    const prefix = `PRD-${type}-${yyyy}-`;
    const last = await prisma.product.findFirst({
        where: { productId: { startsWith: prefix } },
        orderBy: { productId: 'desc' },
        select: { productId: true }
    });
    const next = last ? parseInt(last.productId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${next.toString().padStart(3, '0')}`;
}

// kept for internal use within this file
async function generateCourseId() {
    return generateProductId('course');
}

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────
export async function listCourses({ isActive } = {}) {
    try {
        const prisma = await getPrisma();
        return prisma.product.findMany({
            where: {
                category: 'course',
                ...(isActive !== undefined ? { isActive } : {})
            },
            include: {
                courseMenus: {
                    include: { recipe: true },
                    orderBy: [{ dayNumber: 'asc' }, { sortOrder: 'asc' }]
                },
                courseEquipment: { orderBy: { name: 'asc' } }
            },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        logger.error('[CourseRepo]', 'listCourses failed', error);
        throw error;
    }
}

export async function getCourse(id) {
    try {
        const prisma = await getPrisma();
        return prisma.product.findFirst({
            where: {
                OR: [{ id }, { productId: id }],
                category: 'course'
            },
            include: {
                courseMenus: {
                    include: {
                        recipe: {
                            include: {
                                ingredients: { include: { ingredient: true } },
                                equipment: true
                            }
                        }
                    },
                    orderBy: [{ dayNumber: 'asc' }, { sortOrder: 'asc' }]
                },
                courseEquipment: { orderBy: { name: 'asc' } }
            }
        });
    } catch (error) {
        logger.error('[CourseRepo]', 'getCourse failed', error);
        throw error;
    }
}

// ──────────────────────────────────────────
// Mutations — Course
// ──────────────────────────────────────────
export async function createCourse({ name, description, price, hours, days, sessionType, instructorIds = [], menus = [] }) {
    try {
        const prisma = await getPrisma();
        const productId = await generateCourseId();

        return prisma.product.create({
            data: {
                productId,
                name,
                description,
                price: parseFloat(price),
                category: 'course',
                hours: hours ? parseFloat(hours) : null,
                days: days ? parseFloat(days) : null,
                sessionType: sessionType || null,       // comma-sep: "MORNING,AFTERNOON"
                instructorIds: instructorIds || [],
                isActive: true,
                courseMenus: menus.length > 0 ? {
                    create: menus.map((m, i) => ({
                        recipeId: m.recipeId,
                        dayNumber: parseInt(m.dayNumber) || 1,
                        sessionSlot: m.sessionSlot || null,
                        sortOrder: i
                    }))
                } : undefined
            },
            include: {
                courseMenus: { include: { recipe: true }, orderBy: [{ dayNumber: 'asc' }, { sortOrder: 'asc' }] },
                courseEquipment: true
            }
        });
    } catch (error) {
        logger.error('[CourseRepo]', 'createCourse failed', error);
        throw error;
    }
}

export async function updateCourse(id, data) {
    try {
        const prisma = await getPrisma();
        return prisma.product.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.price !== undefined && { price: parseFloat(data.price) }),
                ...(data.hours !== undefined && { hours: data.hours ? parseFloat(data.hours) : null }),
                ...(data.days !== undefined && { days: data.days ? parseFloat(data.days) : null }),
                ...(data.sessionType !== undefined && { sessionType: data.sessionType || null }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.instructorIds !== undefined && { instructorIds: data.instructorIds })
            },
            include: {
                courseMenus: { include: { recipe: true }, orderBy: [{ dayNumber: 'asc' }, { sortOrder: 'asc' }] },
                courseEquipment: { orderBy: { name: 'asc' } }
            }
        });
    } catch (error) {
        logger.error('[CourseRepo]', 'updateCourse failed', error);
        throw error;
    }
}

// ──────────────────────────────────────────
// Mutations — CourseMenu (menus/recipes per course)
// ──────────────────────────────────────────
export async function addCourseMenu(productId, { recipeId, dayNumber = 1, sessionSlot, sortOrder = 0 }) {
    try {
        const prisma = await getPrisma();
        return prisma.courseMenu.create({
            data: { productId, recipeId, dayNumber: parseInt(dayNumber), sessionSlot: sessionSlot || null, sortOrder: parseInt(sortOrder) },
            include: { recipe: true }
        });
    } catch (error) {
        logger.error('[CourseRepo]', 'addCourseMenu failed', error);
        throw error;
    }
}

export async function removeCourseMenu(courseMenuId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseMenu.delete({ where: { id: courseMenuId } });
    } catch (error) {
        logger.error('[CourseRepo]', 'removeCourseMenu failed', error);
        throw error;
    }
}

// ──────────────────────────────────────────
// Mutations — CourseEquipment (aprons, etc.)
// ──────────────────────────────────────────
export async function addCourseEquipment(productId, { name, qty = 1, isIncluded = true, estimatedCost, notes }) {
    try {
        const prisma = await getPrisma();
        return prisma.courseEquipment.create({
            data: {
                productId,
                name,
                qty: parseInt(qty),
                isIncluded: isIncluded !== false,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
                notes: notes || null
            }
        });
    } catch (error) {
        logger.error('[CourseRepo]', 'addCourseEquipment failed', error);
        throw error;
    }
}

export async function removeCourseEquipment(equipmentId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseEquipment.delete({ where: { id: equipmentId } });
    } catch (error) {
        logger.error('[CourseRepo]', 'removeCourseEquipment failed', error);
        throw error;
    }
}
