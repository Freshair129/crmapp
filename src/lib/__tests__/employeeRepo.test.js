import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as employeeRepo from '@/lib/repositories/employeeRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

describe('employeeRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            employee: { 
                findMany: vi.fn(), 
                findUnique: vi.fn(), 
                findFirst: vi.fn()
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getAllEmployees', () => {
        it('should fetch all employees with status filter', async () => {
            mockPrisma.employee.findMany.mockResolvedValue([{ id: 'e1' }]);
            await employeeRepo.getAllEmployees({ status: 'ACTIVE' });
            expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { status: 'ACTIVE' }
            }));
        });
    });

    describe('getEmployeeById', () => {
        it('should fetch by id', async () => {
            mockPrisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
            const result = await employeeRepo.getEmployeeById('e1');
            expect(result.id).toBe('e1');
        });
    });

    describe('getEmployeeByFbName', () => {
        it('should use JSONB path matching correctly', async () => {
            mockPrisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
            await employeeRepo.getEmployeeByFbName('John Facebook');
            expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    identities: {
                        path: ['facebook', 'name'],
                        equals: 'John Facebook'
                    }
                }
            }));
        });
    });
});
