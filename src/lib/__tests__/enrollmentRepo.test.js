// FILE: src/lib/__tests__/enrollmentRepo.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    createEnrollment, 
    getEnrollmentsByCustomer, 
    updateEnrollmentItemHours, 
    getCustomerEnrollmentSummary 
} from '../repositories/enrollmentRepo';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

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

/**
 * ## Pre-flight Checklist: enrollmentRepo.js
 * 
 * 1. Source Analysis:
 *    - createEnrollment({ customerId, ... }): Uses object parameter.
 *    - updateEnrollmentItemHours(id, hours): Uses positional parameters.
 *    - getCustomerEnrollmentSummary(id): Uses positional parameter.
 *    - Internal call: generateEnrollmentId uses prisma.enrollment.findFirst.
 * 
 * 2. Mock Inventory:
 *    - prisma.enrollment: findFirst, create, findUnique, findMany
 *    - prisma.product: findUnique
 *    - prisma.enrollmentItem: create, createMany, update, findMany, findUnique
 *    - prisma.$transaction: Used in createEnrollment and updateEnrollmentItemHours.
 */

describe('enrollmentRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
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
            },
            $transaction: vi.fn(cb => cb(mockPrisma))
        };
        getPrisma.mockResolvedValue(mockPrisma);

        // Mock Date for ID generation: 2026-03-15
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-15'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('createEnrollment', () => {
        const input = {
            customerId: 'cust-123',
            productId: 'prod-456',
            soldById: 'emp-001',
            totalPrice: 1500,
            notes: 'Test note'
        };

        it('should create enrollment and single enrollment item for direct product', async () => {
            // Mock ID generation
            mockPrisma.enrollment.findFirst.mockResolvedValue(null); // Serial 001
            
            // Mock Product lookup
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-456', name: 'Single Course' });
            
            // Mock Enrollment creation
            mockPrisma.enrollment.create.mockResolvedValue({ id: 'enr-uid-1', enrollmentId: 'ENR-20260315-001' });
            
            // Mock final findUnique (return value)
            mockPrisma.enrollment.findUnique.mockResolvedValue({
                id: 'enr-uid-1',
                enrollmentId: 'ENR-20260315-001',
                items: [{ id: 'item-1', productId: 'prod-456' }]
            });

            const result = await createEnrollment(input);

            expect(mockPrisma.enrollment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { enrollmentId: { startsWith: 'ENR-20260315-' } }
            }));
            expect(mockPrisma.enrollment.create).toHaveBeenCalled();
            expect(mockPrisma.enrollmentItem.create).toHaveBeenCalled();
            expect(result.enrollmentId).toBe('ENR-20260315-001');
        });

        it('should create multiple enrollment items for package product', async () => {
            mockPrisma.enrollment.findFirst.mockResolvedValue({ enrollmentId: 'ENR-20260315-002' }); // Next: 003
            mockPrisma.product.findUnique.mockResolvedValue({ 
                id: 'prod-pkg', 
                metadata: { packageItems: ['p1', 'p2', 'p3'] } 
            });
            mockPrisma.enrollment.create.mockResolvedValue({ id: 'enr-pkg-1' });
            mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-pkg-1', items: [] });

            await createEnrollment({ ...input, productId: 'prod-pkg' });

            expect(mockPrisma.enrollmentItem.createMany).toHaveBeenCalledWith({
                data: [
                    { enrollmentId: 'enr-pkg-1', productId: 'p1', hoursCompleted: 0, status: 'PENDING' },
                    { enrollmentId: 'enr-pkg-1', productId: 'p2', hoursCompleted: 0, status: 'PENDING' },
                    { enrollmentId: 'enr-pkg-1', productId: 'p3', hoursCompleted: 0, status: 'PENDING' }
                ]
            });
        });
    });

    describe('updateEnrollmentItemHours', () => {
        it('should update hours and set certLevel 1 if total hours >= 30', async () => {
            mockPrisma.enrollmentItem.update.mockResolvedValue({ id: 'item-1', enrollmentId: 'enr-1' });
            mockPrisma.enrollmentItem.findMany.mockResolvedValue([
                { id: 'item-1', hoursCompleted: 20 },
                { id: 'item-2', hoursCompleted: 15 } // Total = 35
            ]);
            mockPrisma.enrollmentItem.findUnique.mockResolvedValue({ id: 'item-1', certLevel: 1 });

            const result = await updateEnrollmentItemHours('item-1', 10);

            // First update: increment hours
            expect(mockPrisma.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'item-1' },
                data: { hoursCompleted: { increment: 10 } }
            }));

            // Second update: set certLevel
            expect(mockPrisma.enrollmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'item-1' },
                data: { certLevel: 1 }
            }));

            expect(result.certLevel).toBe(1);
        });

        it('should set certLevel 3 if total hours >= 201', async () => {
            mockPrisma.enrollmentItem.update.mockResolvedValue({ id: 'item-1', enrollmentId: 'enr-1' });
            mockPrisma.enrollmentItem.findMany.mockResolvedValue([
                { id: 'item-1', hoursCompleted: 210 }
            ]);
            
            await updateEnrollmentItemHours('item-1', 200);

            expect(mockPrisma.enrollmentItem.update).toHaveBeenLastCalledWith(expect.objectContaining({
                data: { certLevel: 3 }
            }));
        });
    });

    describe('getCustomerEnrollmentSummary', () => {
        it('should aggregate hours and find max certLevel across all enrollments', async () => {
            mockPrisma.enrollment.findMany.mockResolvedValue([
                {
                    status: 'ACTIVE',
                    items: [
                        { hoursCompleted: 50, certLevel: 1, status: 'COMPLETED' },
                        { hoursCompleted: 80, certLevel: 2, status: 'ACTIVE' }
                    ]
                },
                {
                    status: 'COMPLETED',
                    items: [
                        { hoursCompleted: 10, certLevel: 0, status: 'COMPLETED' }
                    ]
                }
            ]);

            const summary = await getCustomerEnrollmentSummary('cust-777');

            expect(summary.totalHours).toBe(140); // 50 + 80 + 10
            expect(summary.certLevel).toBe(2); // max(1, 2, 0)
            expect(summary.totalCourses).toBe(3);
            expect(summary.completedCourses).toBe(2);
            expect(summary.activeEnrollments).toHaveLength(1);
        });

        it('should return zeros for customer with no enrollments', async () => {
            mockPrisma.enrollment.findMany.mockResolvedValue([]);
            const summary = await getCustomerEnrollmentSummary('new-cust');
            expect(summary.totalHours).toBe(0);
            expect(summary.certLevel).toBe(0);
        });
    });
});
