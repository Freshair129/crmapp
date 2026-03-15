import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPackage, swapCourseInEnrollment } from '../repositories/packageRepo';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { getPrisma } = await import('@/lib/db');

describe('packageRepo', () => {
    let prisma;

    beforeEach(() => {
        vi.clearAllMocks();

        // tx mock replicates the same shape as prisma
        const txMock = {
            packageEnrollmentCourse: {
                delete: vi.fn().mockResolvedValue({}),
                create: vi.fn().mockResolvedValue({})
            },
            packageEnrollment: {
                update: vi.fn().mockResolvedValue({ id: 'enr-1', swapUsedAt: new Date() })
            }
        };

        prisma = {
            package: {
                findFirst: vi.fn().mockResolvedValue(null),
                findUnique: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: 'pkg-1', packageId: 'PKG-2026-001' }),
                update: vi.fn()
            },
            packageEnrollment: {
                findFirst: vi.fn().mockResolvedValue(null),
                findUnique: vi.fn(),
                create: vi.fn()
            },
            // $transaction executes callback with txMock
            $transaction: vi.fn(async (cb) => cb(txMock)),
            _tx: txMock  // expose for assertions
        };
        getPrisma.mockResolvedValue(prisma);
    });

    // ─── createPackage ──────────────────────────────────────────────────────────

    describe('createPackage', () => {
        it('should generate packageId starting with PKG- and current year', async () => {
            await createPackage({ name: 'Starter Pack', originalPrice: 5000, packagePrice: 4000 });
            const call = prisma.package.create.mock.calls[0][0];
            expect(call.data.packageId).toMatch(/^PKG-\d{4}-\d{3}$/);
            expect(call.data.packageId).toContain(new Date().getFullYear().toString());
        });

        it('should increment serial from last packageId', async () => {
            prisma.package.findFirst.mockResolvedValue({ packageId: 'PKG-2026-003' });
            await createPackage({ name: 'Pack B', originalPrice: 5000, packagePrice: 4500 });
            const call = prisma.package.create.mock.calls[0][0];
            expect(call.data.packageId).toBe('PKG-2026-004');
        });

        it('should store originalPrice and packagePrice as numbers', async () => {
            await createPackage({ name: 'Pack', originalPrice: '94000', packagePrice: '59390' });
            const call = prisma.package.create.mock.calls[0][0];
            expect(call.data.originalPrice).toBe(94000);
            expect(call.data.packagePrice).toBe(59390);
        });

        it('should create courses via nested create', async () => {
            const courses = [
                { productId: 'prod-1', isRequired: true, isLocked: false, sortOrder: 0 },
                { productId: 'prod-2', isRequired: false, isLocked: false, swapGroup: 'GROUP_A', sortOrder: 1 }
            ];
            await createPackage({ name: 'Pack', originalPrice: 10000, packagePrice: 8000, courses });
            const call = prisma.package.create.mock.calls[0][0];
            expect(call.data.courses.create).toHaveLength(2);
            expect(call.data.courses.create[0].productId).toBe('prod-1');
            expect(call.data.courses.create[1].swapGroup).toBe('GROUP_A');
        });

        it('should create gifts via nested create', async () => {
            const gifts = [{ name: 'ผ้ากันเปื้อน', qty: 1, estimatedCost: 250 }];
            await createPackage({ name: 'Pack', originalPrice: 5000, packagePrice: 4000, gifts });
            const call = prisma.package.create.mock.calls[0][0];
            expect(call.data.gifts.create).toHaveLength(1);
            expect(call.data.gifts.create[0].name).toBe('ผ้ากันเปื้อน');
            expect(call.data.gifts.create[0].estimatedCost).toBe(250);
        });

        it('should handle empty courses and gifts', async () => {
            await createPackage({ name: 'Pack', originalPrice: 5000, packagePrice: 4500, courses: [], gifts: [] });
            const call = prisma.package.create.mock.calls[0][0];
            expect(call.data.courses.create).toHaveLength(0);
            expect(call.data.gifts.create).toHaveLength(0);
        });
    });

    // ─── swapCourseInEnrollment ─────────────────────────────────────────────────

    describe('swapCourseInEnrollment', () => {
        const enrollmentId = 'enr-uuid-1';
        const oldProductId = 'prod-old';
        const newProductId = 'prod-new';

        it('should throw "Swap already used" if swapUsedAt is set', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue({
                id: enrollmentId,
                swapUsedAt: new Date('2026-03-10'),
                selectedCourses: [{ productId: oldProductId }]
            });

            await expect(swapCourseInEnrollment(enrollmentId, oldProductId, newProductId))
                .rejects.toThrow('Swap already used for this enrollment');

            // Must not touch $transaction at all
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should throw "Package enrollment not found" if enrollment is null', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue(null);
            await expect(swapCourseInEnrollment(enrollmentId, oldProductId, newProductId))
                .rejects.toThrow('Package enrollment not found');
        });

        it('should throw "Original course not found" if oldProductId not in selectedCourses', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue({
                id: enrollmentId,
                swapUsedAt: null,
                selectedCourses: [{ productId: 'some-other-product' }]
            });

            await expect(swapCourseInEnrollment(enrollmentId, oldProductId, newProductId))
                .rejects.toThrow('Original course not found in enrollment');
        });

        it('should execute $transaction when swap is valid', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue({
                id: enrollmentId,
                swapUsedAt: null,
                selectedCourses: [{ productId: oldProductId }]
            });

            await swapCourseInEnrollment(enrollmentId, oldProductId, newProductId);
            expect(prisma.$transaction).toHaveBeenCalledOnce();
        });

        it('should delete old course inside transaction', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue({
                id: enrollmentId,
                swapUsedAt: null,
                selectedCourses: [{ productId: oldProductId }]
            });

            await swapCourseInEnrollment(enrollmentId, oldProductId, newProductId);

            const tx = prisma._tx;
            expect(tx.packageEnrollmentCourse.delete).toHaveBeenCalledWith({
                where: {
                    packageEnrollmentId_productId: {
                        packageEnrollmentId: enrollmentId,
                        productId: oldProductId
                    }
                }
            });
        });

        it('should create new course with wasSwapped: true inside transaction', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue({
                id: enrollmentId,
                swapUsedAt: null,
                selectedCourses: [{ productId: oldProductId }]
            });

            await swapCourseInEnrollment(enrollmentId, oldProductId, newProductId);

            const tx = prisma._tx;
            expect(tx.packageEnrollmentCourse.create).toHaveBeenCalledWith({
                data: {
                    packageEnrollmentId: enrollmentId,
                    productId: newProductId,
                    wasSwapped: true
                }
            });
        });

        it('should update swapUsedAt to current date inside transaction', async () => {
            prisma.packageEnrollment.findUnique.mockResolvedValue({
                id: enrollmentId,
                swapUsedAt: null,
                selectedCourses: [{ productId: oldProductId }]
            });

            await swapCourseInEnrollment(enrollmentId, oldProductId, newProductId);

            const tx = prisma._tx;
            expect(tx.packageEnrollment.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: enrollmentId },
                    data: expect.objectContaining({ swapUsedAt: expect.any(Date) })
                })
            );
        });
    });
});
