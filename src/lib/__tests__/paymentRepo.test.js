import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as paymentRepo from '@/lib/repositories/paymentRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn()
}));

describe('paymentRepo', () => {
    let mockPrisma;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            $transaction: vi.fn((cb) => cb(mockPrisma)),
            transaction: {
                findFirst: vi.fn(),
                create: vi.fn(),
                findMany: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn()
            },
            conversation: {
                findUnique: vi.fn()
            },
            order: {
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('createPendingFromSlip', () => {
        it('throws if confidence is low', async () => {
            const slipResult = { isSlip: true, confidence: 0.5 };
            await expect(paymentRepo.createPendingFromSlip({ slipResult })).rejects.toThrow('Invalid slip or confidence too low');
        });

        it('throws if refNumber is duplicate', async () => {
            const slipResult = { isSlip: true, confidence: 0.9, refNumber: 'REF123' };
            mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'existing-tx' });
            
            await expect(paymentRepo.createPendingFromSlip({ slipResult })).rejects.toThrow('Duplicate slip reference number: REF123');
        });

        it('creates an order and transaction if none exists', async () => {
            const slipResult = { isSlip: true, confidence: 0.9, refNumber: 'REF123', amount: 500 };
            mockPrisma.transaction.findFirst.mockResolvedValue(null);
            mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', customerId: 'cust-1' });
            mockPrisma.order.findFirst.mockResolvedValue(null);
            
            mockPrisma.order.create.mockResolvedValue({ id: 'order-new' });
            mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-new' });

            await paymentRepo.createPendingFromSlip({ 
                messageId: 'msg-1', 
                conversationId: 'conv-1', 
                imageUrl: 'http://img', 
                slipResult 
            });

            expect(mockPrisma.order.create).toHaveBeenCalled();
            expect(mockPrisma.transaction.create).toHaveBeenCalled();
        });
    });

    describe('verifyPayment', () => {
        it('throws if already verified', async () => {
            mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', slipStatus: 'VERIFIED' });
            await expect(paymentRepo.verifyPayment('tx-1', 'EMP-1')).rejects.toThrow('Transaction already verified');
        });

        it('marks transaction verified and order paid', async () => {
            mockPrisma.transaction.findUnique.mockResolvedValue({ 
                id: 'tx-1', 
                slipStatus: 'PENDING', 
                amount: 500,
                order: { id: 'order-1'}
            });
            mockPrisma.transaction.update.mockResolvedValue({ id: 'tx-1', slipStatus: 'VERIFIED' });
            
            await paymentRepo.verifyPayment('tx-1', 'EMP-1');

            expect(mockPrisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ slipStatus: 'VERIFIED' })
            }));
            
            expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'CLOSED', closedById: 'EMP-1' })
            }));
        });
    });

    describe('getMonthlyRevenue', () => {
        it('aggregates correctly between ads and organic', async () => {
            mockPrisma.transaction.findMany.mockResolvedValue([
                { amount: 1000, order: { conversation: { firstTouchAdId: 'ad-123' } } },
                { amount: 500, order: { conversation: { firstTouchAdId: null } } }
            ]);

            const result = await paymentRepo.getMonthlyRevenue(2026, 3);
            
            expect(result.total).toBe(1500);
            expect(result.fromAds).toBe(1000);
            expect(result.organic).toBe(500);
        });
    });
});
