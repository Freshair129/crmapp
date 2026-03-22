import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as customerRepo from '@/lib/repositories/customerRepo';
import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/lib/idGenerators';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/idGenerators', () => ({
    generateCustomerId: vi.fn(),
}));

describe('customerRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            customer: { 
                findMany: vi.fn(), 
                findUnique: vi.fn(), 
                findFirst: vi.fn(),
                upsert: vi.fn(),
                update: vi.fn(),
                create: vi.fn()
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getAllCustomers', () => {
        it('should fetch customers with search filter', async () => {
            mockPrisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);
            await customerRepo.getAllCustomers({ search: 'John' });
            
            expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    OR: expect.arrayContaining([
                        { firstName: { contains: 'John', mode: 'insensitive' } }
                    ])
                }
            }));
        });
    });

    describe('getCustomerById', () => {
        it('should fetch customer with relations', async () => {
            mockPrisma.customer.findUnique.mockResolvedValue({ id: 'c1' });
            await customerRepo.getCustomerById('c1');
            expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                include: expect.any(Object)
            }));
        });
    });

    describe('upsertCustomerByPsid', () => {
        it('should call upsert with generated ID', async () => {
            generateCustomerId.mockResolvedValue('TVS-CUS-FB-26-0001');
            mockPrisma.customer.upsert.mockResolvedValue({ id: 'c1' });
            
            await customerRepo.upsertCustomerByPsid('psid-1', { name: 'John Doe', channel: 'facebook' });
            
            expect(generateCustomerId).toHaveBeenCalledWith('FB');
            expect(mockPrisma.customer.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { facebookId: 'psid-1' },
                create: expect.objectContaining({ customerId: 'TVS-CUS-FB-26-0001' })
            }));
        });
    });

    describe('upsertCustomerByPhone', () => {
        it('should update if exists', async () => {
            mockPrisma.customer.findFirst.mockResolvedValue({ id: 'c-old' });
            mockPrisma.customer.update.mockResolvedValue({ id: 'c-old' });
            
            await customerRepo.upsertCustomerByPhone('0812345678', { firstName: 'Updated' });
            
            expect(mockPrisma.customer.update).toHaveBeenCalled();
            expect(mockPrisma.customer.create).not.toHaveBeenCalled();
        });

        it('should create if not exists', async () => {
            mockPrisma.customer.findFirst.mockResolvedValue(null);
            generateCustomerId.mockResolvedValue('TVS-CUS-PH-26-0002');
            mockPrisma.customer.create.mockResolvedValue({ id: 'c-new' });
            
            await customerRepo.upsertCustomerByPhone('0812345678', { firstName: 'New' });
            
            expect(mockPrisma.customer.create).toHaveBeenCalled();
        });
    });
});
