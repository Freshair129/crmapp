import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generatePackageId, generatePackageEnrollmentId, generateEnrollmentId } from '@/lib/idGenerators';
import crypto from 'crypto';

const PACKAGE_INCLUDE = {
    courses: {
        include: { product: { select: { id: true, name: true, productId: true, price: true, hours: true, sessionType: true, category: true } } },
        orderBy: { sortOrder: 'asc' }
    },
    gifts: true
};

export async function getAllPackages(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { isActive, search } = opts;
        const where = {};
        if (isActive !== undefined && isActive !== null) where.isActive = isActive === 'true' || isActive === true;
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

// ─── POS-optimized query ───────────────────────────────────────

export async function getActivePackagesForPOS() {
    try {
        const prisma = await getPrisma();
        return prisma.package.findMany({
            where: { isActive: true },
            include: {
                courses: {
                    include: {
                        product: {
                            select: { id: true, name: true, productId: true, price: true, hours: true, sessionType: true, category: true, image: true }
                        }
                    },
                    orderBy: { sortOrder: 'asc' }
                },
                gifts: true
            },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to get active packages for POS', error);
        throw error;
    }
}

// ─── Package Enrollment (with linked Enrollment + EnrollmentItems) ───

/**
 * Create PackageEnrollment + linked Enrollment + EnrollmentItems in a single transaction.
 * Generates QR token for attendance scanning.
 */
export async function createPackageEnrollment({ packageId, customerId, soldById, totalPrice, selectedCourseIds = [], notes }) {
    try {
        const prisma = await getPrisma();
        const penrId = await generatePackageEnrollmentId();
        const enrId = await generateEnrollmentId();
        const qrToken = crypto.randomUUID();

        return prisma.$transaction(async (tx) => {
            // 1. Fetch package to get first product (for Enrollment.productId)
            const pkg = await tx.package.findUnique({
                where: { id: packageId },
                include: { courses: { include: { product: true }, orderBy: { sortOrder: 'asc' } } }
            });
            if (!pkg) throw new Error('Package not found');

            const primaryProductId = selectedCourseIds[0] || pkg.courses[0]?.productId;
            if (!primaryProductId) throw new Error('Package has no courses');

            // 2. Create PackageEnrollment
            const pkgEnrollment = await tx.packageEnrollment.create({
                data: {
                    enrollmentId: penrId,
                    packageId,
                    customerId,
                    soldById: soldById || undefined,
                    totalPrice: Number(totalPrice),
                    qrToken,
                    notes
                }
            });

            // 3. Create linked Enrollment
            const enrollment = await tx.enrollment.create({
                data: {
                    enrollmentId: enrId,
                    customerId,
                    productId: primaryProductId,
                    soldById: soldById || undefined,
                    packageEnrollmentId: pkgEnrollment.id,
                    totalPrice: Number(totalPrice),
                    status: 'ACTIVE',
                    notes: `แพ็กเกจ: ${pkg.name}`
                }
            });

            // 4. Create EnrollmentItems for each selected course
            const courseIds = selectedCourseIds.length > 0 ? selectedCourseIds : pkg.courses.map(c => c.productId);

            const enrollmentItems = [];
            for (const productId of courseIds) {
                const item = await tx.enrollmentItem.create({
                    data: {
                        enrollmentId: enrollment.id,
                        productId,
                        hoursCompleted: 0,
                        status: 'PENDING'
                    }
                });
                enrollmentItems.push(item);
            }

            // 5. Create PackageEnrollmentCourse records linked to EnrollmentItems
            for (const item of enrollmentItems) {
                await tx.packageEnrollmentCourse.create({
                    data: {
                        packageEnrollmentId: pkgEnrollment.id,
                        productId: item.productId,
                        enrollmentItemId: item.id,
                        wasSwapped: false
                    }
                });
            }

            // 6. Return full result
            return tx.packageEnrollment.findUnique({
                where: { id: pkgEnrollment.id },
                include: {
                    package: { include: { courses: { include: { product: true } }, gifts: true } },
                    customer: { select: { id: true, firstName: true, lastName: true, nickName: true } },
                    selectedCourses: { include: { product: true, enrollmentItem: true } },
                    enrollment: { include: { items: { include: { product: true } } } }
                }
            });
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
                selectedCourses: {
                    include: {
                        product: { select: { id: true, name: true, productId: true, price: true, hours: true } },
                        enrollmentItem: { select: { id: true, hoursCompleted: true, status: true, certLevel: true } }
                    }
                },
                enrollment: {
                    include: {
                        items: {
                            include: {
                                product: { select: { id: true, name: true, hours: true } },
                                attendances: { select: { id: true, hoursAttended: true, attendedAt: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { enrolledAt: 'desc' }
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to get package enrollments by customer', error);
        throw error;
    }
}

export async function getPackageEnrollmentByQrToken(qrToken) {
    try {
        const prisma = await getPrisma();
        return prisma.packageEnrollment.findUnique({
            where: { qrToken },
            include: {
                package: { select: { name: true } },
                customer: { select: { id: true, firstName: true, lastName: true, nickName: true } },
                selectedCourses: {
                    include: {
                        product: { select: { id: true, name: true, productId: true, hours: true } },
                        enrollmentItem: { select: { id: true, hoursCompleted: true, status: true } }
                    }
                }
            }
        });
    } catch (error) {
        logger.error('[PackageRepo]', 'Failed to get enrollment by QR token', error);
        throw error;
    }
}

/**
 * Swap a course within a package enrollment (one-time only per enrollment)
 */
export async function swapCourseInEnrollment(enrollmentId, oldProductId, newProductId) {
    try {
        const prisma = await getPrisma();

        const enrollment = await prisma.packageEnrollment.findUnique({
            where: { id: enrollmentId },
            include: { selectedCourses: true }
        });
        if (!enrollment) throw new Error('Package enrollment not found');
        if (enrollment.swapUsedAt) throw new Error('Swap already used for this enrollment');

        const oldCourse = enrollment.selectedCourses.find(c => c.productId === oldProductId);
        if (!oldCourse) throw new Error('Original course not found in enrollment');

        return prisma.$transaction(async (tx) => {
            await tx.packageEnrollmentCourse.delete({
                where: { packageEnrollmentId_productId: { packageEnrollmentId: enrollmentId, productId: oldProductId } }
            });

            await tx.packageEnrollmentCourse.create({
                data: { packageEnrollmentId: enrollmentId, productId: newProductId, wasSwapped: true }
            });

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
