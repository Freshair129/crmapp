import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ──────────────────────────────────────────
// ID generation
// ──────────────────────────────────────────

/**
 * Auto-generate a human-readable product ID following id_standards.yaml spec.
 *
 * Product Types:
 *   COURSE      → TVS-{cuisineCode}-{packCode}-{subcatCode}-{SERIAL:02d}
 *                 e.g. TVS-JP-2FC-HC-21
 *   PACKAGE     → TVS-PKG{pkgNo:02d}-{pkgShortName}-{hours}H
 *                 e.g. TVS-PKG01-BUFFET-30H
 *   FULL_COURSE → TVS-FC-FULL-COURSES-{variant}-{hours}H
 *                 variant = A (≤111h) | B (>111h)
 *                 e.g. TVS-FC-FULL-COURSES-A-111H
 *
 * Params (object):
 *   productType   'COURSE' | 'PACKAGE' | 'FULL_COURSE'  (default: 'COURSE')
 *   cuisineCode   'JP' | 'TH' | 'SP' | 'MG' | 'AR'    (COURSE only)
 *   packCode      '1FC' | '2FC' | 'SP'                  (COURSE only)
 *   subcatCode    'HO' | 'CO' | 'SC' | 'DS' | 'HC' | 'HR' | 'HN' | 'MG' | 'AR' (COURSE only)
 *   pkgNo         1–99                                   (PACKAGE only)
 *   pkgShortName  'BUFFET' | 'DELIVERY' | …             (PACKAGE only)
 *   hours         numeric                                (PACKAGE & FULL_COURSE)
 */
export async function generateProductId({
    productType = 'COURSE',
    cuisineCode = 'JP',
    packCode = '2FC',
    subcatCode = 'HO',
    pkgNo,
    pkgShortName,
    hours,
} = {}) {
    const prisma = await getPrisma();
    const type = String(productType).toUpperCase();

    if (type === 'PACKAGE') {
        // Fixed format — pkgNo is the unique serial, no DB lookup needed
        const no = String(pkgNo || 1).padStart(2, '0');
        const name = (pkgShortName || 'PKG').toUpperCase().replace(/\s+/g, '');
        return `TVS-PKG${no}-${name}-${hours || 0}H`;
    }

    if (type === 'FULL_COURSE') {
        const variant = Number(hours) <= 111 ? 'A' : 'B';
        return `TVS-FC-FULL-COURSES-${variant}-${hours || 0}H`;
    }

    // Default: COURSE  →  TVS-{cuisine}-{pack}-{subcat}-{SERIAL}
    const cu = String(cuisineCode).toUpperCase();
    const pk = String(packCode).toUpperCase();
    const sc = String(subcatCode).toUpperCase();
    const prefix = `TVS-${cu}-${pk}-${sc}-`;
    const last = await prisma.product.findFirst({
        where: { productId: { startsWith: prefix } },
        orderBy: { productId: 'desc' },
        select: { productId: true }
    });
    const next = last ? parseInt(last.productId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${next.toString().padStart(2, '0')}`;
}

// kept for internal use within this file
async function generateCourseId() {
    return generateProductId({ productType: 'COURSE' });
}

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────
// All category values that represent a "course" product (shared with POS COURSE_CATS)
const COURSE_CATEGORIES = [
    'course',
    'japanese_culinary',
    'specialty',
    'management',
    'arts',
    'full_course',
];

export async function listCourses({ isActive } = {}) {
    try {
        const prisma = await getPrisma();
        return prisma.product.findMany({
            where: {
                category: { in: COURSE_CATEGORIES },
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
                category: { in: COURSE_CATEGORIES }
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
