import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '@/lib/repositories/aiAssistLogRepo';
import { getPrisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
    getPrisma: vi.fn(),
}));

describe('aiAssistLogRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            aIAssistLog: {
                create: vi.fn(),
                findMany: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('createAIAssistLog', () => {
        it('should create a log entry and return id, conversationId, createdAt', async () => {
            const expected = { id: '1', conversationId: 't_123', createdAt: new Date() };
            mockPrisma.aIAssistLog.create.mockResolvedValue(expected);

            const result = await repo.createAIAssistLog({
                conversationId: 't_123',
                inboxId: 'inbox-1',
                input: 'สวัสดี',
                tone: 'friendly',
                reply: 'สวัสดีค่ะ',
                customerName: 'Test',
            });

            expect(result).toEqual(expected);
            expect(mockPrisma.aIAssistLog.create).toHaveBeenCalledWith({
                data: {
                    conversationId: 't_123',
                    inboxId: 'inbox-1',
                    input: 'สวัสดี',
                    tone: 'friendly',
                    reply: 'สวัสดีค่ะ',
                    customerName: 'Test',
                },
                select: { id: true, conversationId: true, createdAt: true },
            });
        });

        it('should return null on error (non-fatal)', async () => {
            mockPrisma.aIAssistLog.create.mockRejectedValue(new Error('DB error'));
            const result = await repo.createAIAssistLog({ conversationId: 't_123' });
            expect(result).toBeNull();
        });
    });

    describe('getAIAssistHistory', () => {
        it('should return history newest first with default limit 20', async () => {
            const logs = [{ id: '1' }, { id: '2' }];
            mockPrisma.aIAssistLog.findMany.mockResolvedValue(logs);

            const result = await repo.getAIAssistHistory('t_123');

            expect(result).toEqual(logs);
            expect(mockPrisma.aIAssistLog.findMany).toHaveBeenCalledWith({
                where: { conversationId: 't_123' },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, input: true, tone: true, reply: true, customerName: true, createdAt: true },
            });
        });

        it('should respect custom limit', async () => {
            mockPrisma.aIAssistLog.findMany.mockResolvedValue([]);
            await repo.getAIAssistHistory('t_123', 5);
            expect(mockPrisma.aIAssistLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5 })
            );
        });

        it('should return empty array on error', async () => {
            mockPrisma.aIAssistLog.findMany.mockRejectedValue(new Error('DB error'));
            const result = await repo.getAIAssistHistory('t_123');
            expect(result).toEqual([]);
        });
    });
});
