// FILE: src/lib/__tests__/enrollmentRepo.test.js
/**
 * ## Pre-flight: enrollmentRepo.js
 * Models used: 
 *   - prisma.enrollment (findFirst, create, findUnique, findMany)
 *   - prisma.product (findUnique)
 *   - prisma.enrollmentItem (create, createMany, update, findMany, findUnique)
 * Internal calls: 
 *   - createEnrollment() calls generateEnrollmentId() → mock prisma.enrollment.findFirst
 *   - updateEnrollmentItemHours() inside tx calls findMany/update → mock at DB level
 *   - getCustomerEnrollmentSummary() calls getEnrollmentsByCustomer() → mock prisma.enrollment.findMany
 * Function signatures: 
 *   - createEnrollment({ customerId, productId, soldById, totalPrice, notes })
 *   - getEnrollmentsByCustomer(customerId)
 *   - updateEnrollmentItemHours(enrollmentItemId, hoursToAdd)
 *   - getCustomerEnrollmentSummary(customerId)
 * Potential mock gaps: include nested product objects in findUnique/findMany returns.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    createEnrollment, 
    getEnrollmentsByCustomer, 
    updateEnrollmentItemHours, 
    getCustomerEnrollmentSummary 
} from '../repositories/enrollmentRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

describe('enrollmentRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            $transaction: vi.fn(cb => cb(mockPrisma)),
            enrollment: {
                findFirst: vi.fn(),
                create: vi.fn(),
                findUnique: vi.fn(),
                findMany: vi.fn()
            },
            product: {
                findUnique: vi.fn()
            },
            enrollmentItem: {
                create: vi.fn(),
                createMany: vi.fn(),
                update: vi.fn(),
                findMany: vi.fn(),
                findUnique: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('createEnrollment', () => {
        it('should generate enrollmentId and create single course enrollment', async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-03-15'));
            
            // Mock generateEnrollmentId dependencies
            mockPrisma.enrollment.findFirst.mockResolvedValue(null); // No existing ENR for today
            
            // Mock tx logic
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', metadata: null });
            mockPrisma.enrollment.create.mockResolvedValue({ id: 'enr-uuid-1' });
            mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-uuid-1', items: [] });

            await createEnrollment({ 
                customerId: 'cus-1', 
                productId: 'prod-1', 
                soldById: 'agent-1', 
                totalPrice: 1000 
            });

            expect(mockPrisma.enrollment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { enrollmentId: { startsWith: 'ENR-20260315-' } }
            }));
            expect(mockPrisma.enrollment.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    enrollmentId: 'ENR-20260315-001',
                    productId: 'prod-1'
                })
            }));
            expect(mockPrisma.enrollmentItem.create).toHaveBeenCalled();
        });

        it('should expand packageItems using createMany', async () => {
            mockPrisma.enrollment.findFirst.mockResolvedValue(null);
            mockPrisma.product.findUnique.mockResolvedValue({ 
                id: 'pkg-1', 
                metadata: { packageItems: ['p1', 'p2'] } 
            });
            mockPrisma.enrollment.create.mockResolvedValue({ id: 'enr-1' });

            await createEnrollment({ customerId: 'c1', productId: 'pkg-1' });

            expect(mockPrisma.enrollmentItem.createMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({ productId: 'p1' }),
                    expect.objectContaining({ productId: 'p2' })
                ])
            }));
            const callArgs = mockPrisma.enrollmentItem.createMany.mock.calls[0][0];
            expect(callArgs.data).toHaveLength(2);
        });

        it('should throw Error if product not found', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);
            await expect(createEnrollment({ productId: 'invalid' })).rejects.toThrow('Product not found');
        });
    });

    describe('updateEnrollmentItemHours', () => {
        it('should reach certLevel 1 at 30 hours', async () => {
            mockPrisma.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', enrollmentId: 'enr-1', hoursCompleted: 30 });
            mockPrisma.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 30 }]);
            mockPrisma.enrollmentItem.findUnique.mockResolvedValue({ id: 'item-1', certLevel: 1 });

            const result = await updateEnrollmentItemHours('item-1', 10);

            // Verify first update (increment)
            expect(mockPrisma.enrollmentItem.update).toHaveBeenNthCalledWith(1, expect.objectContaining({
                data: { hoursCompleted: { increment: 10 } }
            }));
            // Verify second update (certLevel)
            expect(mockPrisma.enrollmentItem.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
                data: { certLevel: 1 }
            }));
            expect(result.certLevel).toBe(1);
        });

        it('should handle certLevel 2 (111h) and 3 (201h)', async () => {
            // Case 201h → Level 3
            mockPrisma.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', enrollmentId: 'enr-1', hoursCompleted: 201 });
            mockPrisma.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 201 }]);
            
            await updateEnrollmentItemHours('item-1', 1);
            expect(mockPrisma.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { certLevel: 3 }
            }));
        });

        it('should NOT update certLevel if below 30h', async () => {
            mockPrisma.enrollmentItem.update.mockResolvedValueOnce({ id: 'item-1', hoursCompleted: 25 });
            mockPrisma.enrollmentItem.findMany.mockResolvedValue([{ hoursCompleted: 25 }]);

            await updateEnrollmentItemHours('item-1', 5);
            
            // Only 1 call total (the increment)
            expect(mockPrisma.enrollmentItem.update).toHaveBeenCalledTimes(1);
        });
    });

    describe('getCustomerEnrollmentSummary', () => {
        it('should aggregate data cross-enrollments by mocking findMany', async () => {
            // Mocking internal call dependency getEnrollmentsByCustomer via DB level
            mockPrisma.enrollment.findMany.mockResolvedValue([
                { 
                    id: 'e1', 
                    status: 'ACTIVE',
                    items: [
                        { hoursCompleted: 10, certLevel: 1, status: 'COMPLETED' },
                        { hoursCompleted: 20, certLevel: 2, status: 'PENDING' }
                    ] 
                },
                {
                    id: 'e2',
                    status: 'CLOSED',
                    items: [
                        { hoursCompleted: 5, certLevel: null, status: 'COMPLETED' }
                    ]
                }
            ]);

            const summary = await getCustomerEnrollmentSummary('cus-1');

            expect(summary.totalHours).toBe(35); // 10+20+5
            expect(summary.certLevel).toBe(2);
            expect(summary.completedCourses).toBe(2);
            expect(summary.activeEnrollments).toHaveLength(1);
        });
    });
});
