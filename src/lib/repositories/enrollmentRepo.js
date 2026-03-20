import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { autoIssueCertificate } from '@/lib/repositories/certificateRepo';

async function generateEnrollmentId() {
    const prisma = await getPrisma();
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');
    const prefix = `ENR-${dateStr}-`;
    const last = await prisma.enrollment.findFirst({
        where: { enrollmentId: { startsWith: prefix } },
        orderBy: { enrollmentId: 'desc' }
    });
    const nextSerial = last ? parseInt(last.enrollmentId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${nextSerial.toString().padStart(3, '0')}`;
}

export async function createEnrollment({ customerId, productId, soldById, totalPrice, notes }) {
    try {
        const prisma = await getPrisma();
        const enrollmentId = await generateEnrollmentId();

        return await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product) throw new Error(`Product not found: ${productId}`);

            const enrollment = await tx.enrollment.create({
                data: { enrollmentId, customerId, productId, soldById, totalPrice, notes, status: 'ACTIVE' }
            });

            // Package → expand into multiple EnrollmentItems
            const packageItems = product.metadata?.packageItems;
            if (Array.isArray(packageItems) && packageItems.length > 0) {
                await tx.enrollmentItem.createMany({
                    data: packageItems.map(pId => ({
                        enrollmentId: enrollment.id,
                        productId: pId,
                        hoursCompleted: 0,
                        status: 'PENDING'
                    }))
                });
            } else {
                await tx.enrollmentItem.create({
                    data: { enrollmentId: enrollment.id, productId, hoursCompleted: 0, status: 'PENDING' }
                });
            }

            return tx.enrollment.findUnique({
                where: { id: enrollment.id },
                include: { items: { include: { product: true } } }
            });
        });
    } catch (error) {
        logger.error('[EnrollmentRepo]', 'Failed to create enrollment', error);
        throw error;
    }
}

export async function getEnrollmentsByCustomer(customerId) {
    try {
        const prisma = await getPrisma();
        const enrollments = await prisma.enrollment.findMany({
            where: { customerId },
            include: { items: { include: { product: true } } },
            orderBy: { enrolledAt: 'desc' }
        });

        return enrollments.map(e => ({
            ...e,
            totalHours: e.items.reduce((sum, item) => sum + (item.hoursCompleted || 0), 0)
        }));
    } catch (error) {
        logger.error('[EnrollmentRepo]', 'Failed to get enrollments by customer', error);
        throw error;
    }
}

export async function getEnrollmentById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.enrollment.findUnique({
            where: { id },
            include: {
                product: true,
                customer: true,
                soldBy: { select: { firstName: true, lastName: true, nickName: true } },
                items: {
                    include: {
                        product: true,
                        attendances: { include: { schedule: true } }
                    }
                }
            }
        });
    } catch (error) {
        logger.error('[EnrollmentRepo]', 'Failed to get enrollment by ID', error);
        throw error;
    }
}

export async function updateEnrollmentItemHours(enrollmentItemId, hoursToAdd) {
    try {
        const prisma = await getPrisma();

        // Capture totalHours outside transaction so cert logic can use it
        let totalHoursSnapshot = 0;
        let enrollmentSnapshot = null;

        const result = await prisma.$transaction(async (tx) => {
            // Increment hours on this item
            const updatedItem = await tx.enrollmentItem.update({
                where: { id: enrollmentItemId },
                data: { hoursCompleted: { increment: hoursToAdd } },
                include: { enrollment: { select: { id: true, customerId: true } } }
            });

            // Sum all items in enrollment for cert threshold check
            const allItems = await tx.enrollmentItem.findMany({
                where: { enrollmentId: updatedItem.enrollmentId }
            });
            const totalHours = allItems.reduce((sum, i) => sum + (i.hoursCompleted || 0), 0);

            // Snapshot for post-transaction cert logic
            totalHoursSnapshot = totalHours;
            enrollmentSnapshot = updatedItem.enrollment;

            // Update certLevel on the item itself
            let certLevel = null;
            if (totalHours >= 201) certLevel = 3;
            else if (totalHours >= 111) certLevel = 2;
            else if (totalHours >= 30) certLevel = 1;

            if (certLevel !== null) {
                await tx.enrollmentItem.update({
                    where: { id: enrollmentItemId },
                    data: { certLevel }
                });
            }

            return tx.enrollmentItem.findUnique({ where: { id: enrollmentItemId } });
        });

        // ── Auto-issue Certificate (post-transaction, idempotent, fire-and-forget) ──
        if (totalHoursSnapshot >= 30 && enrollmentSnapshot) {
            autoIssueCertificate({
                customerId: enrollmentSnapshot.customerId,
                enrollmentId: enrollmentSnapshot.id,
                totalHours: totalHoursSnapshot,
            }).catch(err => logger.error('[EnrollmentRepo]', 'autoIssueCertificate error (non-fatal)', err));
        }

        return result;
    } catch (error) {
        logger.error('[EnrollmentRepo]', 'Failed to update enrollment item hours', error);
        throw error;
    }
}

export async function getCustomerEnrollmentSummary(customerId) {
    try {
        const enrollments = await getEnrollmentsByCustomer(customerId);
        const totalHours = enrollments.reduce((sum, e) => sum + e.totalHours, 0);
        const allCertLevels = enrollments.flatMap(e => e.items.map(i => i.certLevel || 0));
        const certLevel = allCertLevels.length > 0 ? Math.max(...allCertLevels) : 0;

        return {
            totalCourses: enrollments.reduce((sum, e) => sum + e.items.length, 0),
            completedCourses: enrollments.flatMap(e => e.items).filter(i => i.status === 'COMPLETED').length,
            totalHours,
            certLevel,
            activeEnrollments: enrollments.filter(e => e.status === 'ACTIVE')
        };
    } catch (error) {
        logger.error('[EnrollmentRepo]', 'Failed to get customer enrollment summary', error);
        throw error;
    }
}
