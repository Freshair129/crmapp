import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

async function generatePackageId() {
    const prisma = await getPrisma();
    const year = new Date().getFullYear();
    const prefix = `PKG-${year}-`;
    const last = await prisma.package.findFirst({
        where: { packageId: { startsWith: prefix } },
        orderBy: { packageId: 'desc' }
    });
    const nextSerial = last ? parseInt(last.packageId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${nextSerial.toString().padStart(3, '0')}`;
}

async function generatePackageEnrollmentId() {
    const prisma = await getPrisma();
    const year = new Date().getFullYear();
    const prefix = `PENR-${year}-`;
    const last = await prisma.packageEnrollment.findFirst({
        where: { enrollmentId: { startsWith: prefix } },
        orderBy: { enrollmentId: 'desc' }
    });
    const nextSerial = last ? parseInt(last.enrollmentId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${nextSerial.toString().padStart(4, '0')}`;
}

const PACKAGE_INCLUDE = {
    courses: {
        include: { product: { select: { id: true, name: true, productId: true, price: true, hours: true, sessionType: true } } },
        orderBy: { sortOrder: 'asc' }
    },
    gifts: true
};

export async function getAllPackages(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { isActive, search } = opts;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
        if (search) where.name = { contains: search, mode: 'insensitive' };

        return prisma.package.findMany({
            where,
            include: PACKAGE_INCLUDE,
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to get packages', error);
        throw error;
    }
}

export async function getPackageById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.package.findUnique({
            where: { id },
            include: PACKAGE_INCLUDE
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to get package by id', error);
        throw error;
    }
}

export async function createPackage({ name, description, originalPrice, packagePrice, courses = [], gifts = [] }) {
    try {
        const prisma = await getPrisma();
        const packageId = await generatePackageId();

        return prisma.package.create({
            data: {
                packageId,
                name,
                description,
                originalPrice: Number(originalPrice),
                packagePrice: Number(packagePrice),
                courses: {
                    create: courses.map((c, i) => ({
                        productId: c.productId,
                        isRequired: c.isRequired ?? true,
                        isLocked: c.isLocked ?? false,
                        swapGroup: c.swapGroup ?? null,
                        swapGroupMax: c.swapGroupMax ? Number(c.swapGroupMax) : null,
                        sortOrder: c.sortOrder ?? i
                    }))
                },
                gifts: {
                    create: gifts.map(g => ({
                        name: g.name,
                        qty: Number(g.qty ?? 1),
                        estimatedCost: g.estimatedCost ? Number(g.estimatedCost) : null,
                        notes: g.notes
                    }))
                }
            },
            include: PACKAGE_INCLUDE
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to create package', error);
        throw error;
    }
}

export async function updatePackage(id, data) {
    try {
        const prisma = await getPrisma();
        return prisma.package.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.originalPrice !== undefined && { originalPrice: Number(data.originalPrice) }),
                ...(data.packagePrice !== undefined && { packagePrice: Number(data.packagePrice) }),
            },
            include: PACKAGE_INCLUDE
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to update package', error);
        throw error;
    }
}

// ─── Package Enrollment ───────────────────────────────────────

export async function createPackageEnrollment({ packageId, customerId, soldById, totalPrice, selectedCourseIds = [], notes }) {
    try {
        const prisma = await getPrisma();
        const enrollmentId = await generatePackageEnrollmentId();

        return prisma.packageEnrollment.create({
            data: {
                enrollmentId,
                packageId,
                customerId,
                soldById: soldById || undefined,
                totalPrice: Number(totalPrice),
                notes,
                selectedCourses: {
                    create: selectedCourseIds.map(productId => ({ productId, wasSwapped: false }))
                }
            },
            include: {
                package: { include: { courses: { include: { product: true } }, gifts: true } },
                customer: { select: { id: true, firstName: true, lastName: true, nickName: true } },
                selectedCourses: { include: { product: true } }
            }
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to create package enrollment', error);
        throw error;
    }
}

export async function getPackageEnrollmentsByCustomer(customerId) {
    try {
        const prisma = await getPrisma();
        return prisma.packageEnrollment.findMany({
            where: { customerId },
            include: {
                package: { include: { courses: { include: { product: true } }, gifts: true } },
                selectedCourses: { include: { product: true } }
            },
            orderBy: { enrolledAt: 'desc' }
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to get package enrollments by customer', error);
        throw error;
    }
}

/**
 * Swap a course within a package enrollment (one-time only per enrollment)
 * @param {string} enrollmentId - PackageEnrollment.id (UUID)
 * @param {string} oldProductId - Course to remove
 * @param {string} newProductId - Course to add
 */
export async function swapCourseInEnrollment(enrollmentId, oldProductId, newProductId) {
    try {
        const prisma = await getPrisma();

        // Verify: enrollment exists and hasn't used swap
        const enrollment = await prisma.packageEnrollment.findUnique({
            where: { id: enrollmentId },
            include: { selectedCourses: true }
        });
        if (!enrollment) throw new Error('Package enrollment not found');
        if (enrollment.swapUsedAt) throw new Error('Swap already used for this enrollment');

        const oldCourse = enrollment.selectedCourses.find(c => c.productId === oldProductId);
        if (!oldCourse) throw new Error('Original course not found in enrollment');

        return prisma.$transaction(async (tx) => {
            // Remove old course
            await tx.packageEnrollmentCourse.delete({
                where: { packageEnrollmentId_productId: { packageEnrollmentId: enrollmentId, productId: oldProductId } }
            });

            // Add new course (wasSwapped = true)
            await tx.packageEnrollmentCourse.create({
                data: { packageEnrollmentId: enrollmentId, productId: newProductId, wasSwapped: true }
            });

            // Mark swap used
            return tx.packageEnrollment.update({
                where: { id: enrollmentId },
                data: { swapUsedAt: new Date() },
                include: {
                    package: true,
                    selectedCourses: { include: { product: true } }
                }
            });
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to swap course', error);
        throw error;
    }
}
