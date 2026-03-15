// FILE: src/lib/__tests__/enrollmentRepo.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    updateEnrollmentItemHours,
    getCustomerEnrollmentSummary,
    createEnrollment,
} from '../repositories/enrollmentRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn()
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

describe('enrollmentRepo', () => {
    let mockPrisma;
    let mockTx;

    beforeEach(() => {
        vi.clearAllMocks();
        mockTx = {
            enrollmentItem: {
                update: vi.fn(),
                findMany: vi.fn(),
                findUnique: vi.fn(),
                create: vi.fn(),
                createMany: vi.fn()
            },
            product: {
                findUnique: vi.fn()
            },
            enrollment: {
                create: vi.fn(),
                findUnique: vi.fn()
            }
        };
        mockPrisma = {
            $transaction: vi.fn(cb => cb(mockTx)),
            enrollmentItem: mockTx.enrollmentItem,
            product: mockTx.product,
            enrollment: {
                ...mockTx.enrollment,
                // generateEnrollmentId() calls findFirst — must not be undefined
                findFirst: vi.fn().mockResolvedValue(null),
                findMany: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    // ─────────────────────────────────────────────────
    // updateEnrollmentItemHours
    // ─────────────────────────────────────────────────
    describe('updateEnrollmentItemHours', () => {
        it('should set certLevel=1 when totalHours reaches 30', async () => {
            mockTx.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', enrollmentId: 'enr-1', hoursCompleted: 30 });
            mockTx.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 30 }]);
            mockTx.enrollmentItem.findUnique.mockResolvedValue({ id: 'item-1', certLevel: 1 });

            const result = await updateEnrollmentItemHours('item-1', 10);

            expect(mockTx.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'item-1' },
                data: { hoursCompleted: { increment: 10 } }
            }));
            expect(mockTx.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'item-1' },
                data: { certLevel: 1 }
            }));
            expect(result.certLevel).toBe(1);
        });

        it('should set certLevel=2 when totalHours reaches 111', async () => {
            mockTx.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', enrollmentId: 'enr-1', hoursCompleted: 111 });
            mockTx.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 111 }]);
            mockTx.enrollmentItem.findUnique.mockResolvedValue({ id: 'item-1', certLevel: 2 });

            const result = await updateEnrollmentItemHours('item-1', 11);

            expect(mockTx.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { certLevel: 2 }
            }));
            expect(result.certLevel).toBe(2);
        });

        it('should set certLevel=3 when totalHours reaches 201', async () => {
            mockTx.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', enrollmentId: 'enr-1', hoursCompleted: 201 });
            mockTx.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 201 }]);
            mockTx.enrollmentItem.findUnique.mockResolvedValue({ id: 'item-1', certLevel: 3 });

            const result = await updateEnrollmentItemHours('item-1', 1);

            expect(mockTx.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { certLevel: 3 }
            }));
            expect(result.certLevel).toBe(3);
        });

        it('should NOT update certLevel when totalHours < 30', async () => {
            mockTx.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', enrollmentId: 'enr-1', hoursCompleted: 20 });
            mockTx.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 20 }]);
            mockTx.enrollmentItem.findUnique.mockResolvedValue({ id: 'item-1', certLevel: null });

            await updateEnrollmentItemHours('item-1', 5);

            // Only 1 update call (hoursCompleted increment) — no certLevel update
            expect(mockTx.enrollmentItem.update).toHaveBeenCalledTimes(1);
            expect(mockTx.enrollmentItem.update).not.toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ certLevel: expect.anything() })
            }));
        });
    });

    // ─────────────────────────────────────────────────
    // getCustomerEnrollmentSummary
    // Mocked at DB level — getEnrollmentsByCustomer calls prisma.enrollment.findMany
    // ─────────────────────────────────────────────────
    describe('getCustomerEnrollmentSummary', () => {
        it('should calculate totalHours as sum of all items across enrollments', async () => {
            mockPrisma.enrollment.findMany.mockResolvedValue([
                { status: 'ACTIVE', items: [{ hoursCompleted: 10, status: 'PENDING', certLevel: null }, { hoursCompleted: 20, status: 'PENDING', certLevel: null }] },
                { status: 'ACTIVE', items: [{ hoursCompleted: 15, status: 'PENDING', certLevel: null }] }
            ]);

            const result = await getCustomerEnrollmentSummary('cus-1');

            expect(result.totalHours).toBe(45);
        });

        it('should return highest certLevel across all items', async () => {
            mockPrisma.enrollment.findMany.mockResolvedValue([
                { status: 'ACTIVE', items: [{ hoursCompleted: 30, status: 'PENDING', certLevel: 1 }, { hoursCompleted: 81, status: 'PENDING', certLevel: 2 }] },
                { status: 'ACTIVE', items: [{ hoursCompleted: 0, status: 'PENDING', certLevel: null }] }
            ]);

            const result = await getCustomerEnrollmentSummary('cus-1');

            expect(result.certLevel).toBe(2);
        });

        it('should count completedCourses correctly', async () => {
            mockPrisma.enrollment.findMany.mockResolvedValue([
                { status: 'ACTIVE', items: [{ hoursCompleted: 10, status: 'COMPLETED', certLevel: null }, { hoursCompleted: 5, status: 'PENDING', certLevel: null }] },
                { status: 'ACTIVE', items: [{ hoursCompleted: 20, status: 'COMPLETED', certLevel: null }] }
            ]);

            const result = await getCustomerEnrollmentSummary('cus-1');

            expect(result.completedCourses).toBe(2);
        });
    });

    // ─────────────────────────────────────────────────
    // createEnrollment
    // ─────────────────────────────────────────────────
    describe('createEnrollment', () => {
        beforeEach(() => {
            // generateEnrollmentId → needs findFirst + enrollment.create result
            mockPrisma.enrollment.findFirst.mockResolvedValue(null);
            mockTx.enrollment.create.mockResolvedValue({ id: 'enr-uuid-1' });
            mockTx.enrollment.findUnique.mockResolvedValue({ id: 'enr-uuid-1', items: [] });
        });

        it('should create 1 EnrollmentItem for a single course product', async () => {
            mockTx.product.findUnique.mockResolvedValue({ id: 'prod-1', metadata: null });

            await createEnrollment({ customerId: 'cus-1', productId: 'prod-1', totalPrice: 5000 });

            expect(mockTx.enrollmentItem.create).toHaveBeenCalledTimes(1);
            expect(mockTx.enrollmentItem.createMany).not.toHaveBeenCalled();
        });

        it('should expand package into multiple EnrollmentItems', async () => {
            mockTx.product.findUnique.mockResolvedValue({
                id: 'pkg-1',
                metadata: { packageItems: ['prod-1', 'prod-2', 'prod-3'] }
            });

            await createEnrollment({ customerId: 'cus-1', productId: 'pkg-1', totalPrice: 15000 });

            expect(mockTx.enrollmentItem.createMany).toHaveBeenCalledTimes(1);
            const callArg = mockTx.enrollmentItem.createMany.mock.calls[0][0];
            expect(callArg.data).toHaveLength(3);
        });

        it('should throw if product not found', async () => {
            mockTx.product.findUnique.mockResolvedValue(null);

            await expect(createEnrollment({ customerId: 'cus-1', productId: 'invalid', totalPrice: 0 }))
                .rejects.toThrow('Product not found: invalid');
        });
    });
});
