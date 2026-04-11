import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPendingFromSlip, verifyPayment } from '@/lib/repositories/paymentRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('paymentRepo', () => {
  let mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      transaction: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      conversation: {
        findUnique: vi.fn(),
      },
      order: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };
    getPrisma.mockResolvedValue(mockPrisma);
  });

  describe('createPendingFromSlip', () => {
    const validSlipResult = {
      isSlip: true,
      confidence: 0.9,
      refNumber: 'REF123',
      amount: 1000,
      date: '2026-03-24T10:00:00Z',
    };

    it('should throw if slipResult.isSlip is false', async () => {
      await expect(createPendingFromSlip({ slipResult: { ...validSlipResult, isSlip: false } }))
        .rejects.toThrow('Invalid slip or confidence too low');
    });

    it('should throw if slipResult.confidence < 0.8', async () => {
      await expect(createPendingFromSlip({ slipResult: { ...validSlipResult, confidence: 0.7 } }))
        .rejects.toThrow('Invalid slip or confidence too low');
    });

    it('should throw if refNumber already exists in DB', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'existing-tx' });
      await expect(createPendingFromSlip({ slipResult: validSlipResult }))
        .rejects.toThrow(/Duplicate slip reference number/);
    });

    it('should throw if conversation not found', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      await expect(createPendingFromSlip({ conversationId: 'conv-1', slipResult: validSlipResult }))
        .rejects.toThrow(/Conversation not found/);
    });

    it('should throw if conversation has no customerId', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', customerId: null });
      await expect(createPendingFromSlip({ conversationId: 'conv-1', slipResult: validSlipResult }))
        .rejects.toThrow(/missing customer/);
    });

    it('should create a new PENDING order if none exists', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', customerId: 'cus-1' });
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.create.mockResolvedValue({ id: 'new-order-id' });
      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-1', slipStatus: 'PENDING' });

      await createPendingFromSlip({ conversationId: 'conv-1', slipResult: validSlipResult });

      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ orderId: 'new-order-id' })
      }));
    });

    it('should create transaction with slipStatus PENDING and return it', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', customerId: 'cus-1' });
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
      const createdTx = { id: 'tx-1', slipStatus: 'PENDING' };
      mockPrisma.transaction.create.mockResolvedValue(createdTx);

      const result = await createPendingFromSlip({ conversationId: 'conv-1', slipResult: validSlipResult });

      expect(result).toEqual(createdTx);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ slipStatus: 'PENDING' })
      }));
    });
  });

  describe('verifyPayment', () => {
    it('should throw Transaction not found if not in DB', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      await expect(verifyPayment('tx-1', 'emp-1')).rejects.toThrow('Transaction not found');
    });

    it('should throw Transaction already verified if slipStatus === VERIFIED', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', slipStatus: 'VERIFIED' });
      await expect(verifyPayment('tx-1', 'emp-1')).rejects.toThrow('Transaction already verified');
    });

    it('should update transaction slipStatus to VERIFIED', async () => {
      const tx = { id: 'tx-1', slipStatus: 'PENDING', amount: 500, order: { id: 'order-1' } };
      mockPrisma.transaction.findUnique.mockResolvedValue(tx);
      mockPrisma.transaction.update.mockResolvedValue({ ...tx, slipStatus: 'VERIFIED' });

      await verifyPayment('tx-1', 'emp-1');

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'tx-1' },
        data: expect.objectContaining({ slipStatus: 'VERIFIED' })
      }));
    });

    it('should update order to CLOSED and increment paidAmount', async () => {
      const tx = { id: 'tx-1', slipStatus: 'PENDING', amount: 500, order: { id: 'order-1' } };
      mockPrisma.transaction.findUnique.mockResolvedValue(tx);
      mockPrisma.transaction.update.mockResolvedValue({ ...tx, slipStatus: 'VERIFIED' });

      await verifyPayment('tx-1', 'emp-1');

      expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'CLOSED',
          paidAmount: { increment: 500 },
          closedById: 'emp-1'
        })
      }));
    });

    it('should return updated transaction', async () => {
      const tx = { id: 'tx-1', slipStatus: 'PENDING', amount: 500, order: { id: 'order-1' } };
      const updatedTx = { ...tx, slipStatus: 'VERIFIED' };
      mockPrisma.transaction.findUnique.mockResolvedValue(tx);
      mockPrisma.transaction.update.mockResolvedValue(updatedTx);

      const result = await verifyPayment('tx-1', 'emp-1');
      expect(result).toEqual(updatedTx);
    });
  });
});
