import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agentSyncRepo from '@/lib/repositories/agentSyncRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

describe('agentSyncRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            employee: { findFirst: vi.fn() },
            message: { updateMany: vi.fn() },
            conversation: { 
                findUnique: vi.fn(), 
                update: vi.fn(),
                updateMany: vi.fn() 
            },
            $queryRaw: vi.fn(),
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('resolveEmployeeByName', () => {
        it('should resolve via facebook name using queryRaw', async () => {
            mockPrisma.$queryRaw.mockResolvedValue([{ id: 'emp-1' }]);
            
            const result = await agentSyncRepo.resolveEmployeeByName('John Doe');
            
            expect(result).toBe('emp-1');
            expect(mockPrisma.$queryRaw).toHaveBeenCalled();
        });

        it('should fallback to nicknames if queryRaw fails', async () => {
            mockPrisma.$queryRaw.mockResolvedValue([]);
            mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-2' });
            
            const result = await agentSyncRepo.resolveEmployeeByName('Jane');
            
            expect(result).toBe('emp-2');
            expect(mockPrisma.employee.findFirst).toHaveBeenCalled();
        });

        it('should use cache and not query DB twice', async () => {
            mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'emp-1' }]);
            const cache = new Map();
            
            await agentSyncRepo.resolveEmployeeByName('John', cache);
            const result2 = await agentSyncRepo.resolveEmployeeByName('John', cache);
            
            expect(result2).toBe('emp-1');
            expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
        });
    });

    describe('attributeByMsgId', () => {
        it('should update messages with responderId', async () => {
            mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
            const count = await agentSyncRepo.attributeByMsgId('c1', 'm1', 'e1');
            expect(count).toBe(1);
            expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { conversationId: 'c1', messageId: 'm1', responderId: null },
                data: { responderId: 'e1' }
            }));
        });
    });

    describe('learnConversationId', () => {
        it('should update conversationId if not duplicate', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue(null);
            await agentSyncRepo.learnConversationId('old-id', 'new-id', 'p-123');
            
            expect(mockPrisma.conversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { conversationId: 'old-id' },
                data: { conversationId: 'new-id', participantId: 'p-123' }
            }));
        });

        it('should skip update if new-id already exists', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'existing' });
            await agentSyncRepo.learnConversationId('old-id', 'new-id');
            expect(mockPrisma.conversation.updateMany).not.toHaveBeenCalled();
        });
    });

    describe('processAgentAttribution', () => {
        it('should run full attribution pipeline', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'uuid-c1' });
            mockPrisma.$queryRaw.mockResolvedValue([{ id: 'emp-agent' }]);
            mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

            const payload = {
                conversationId: 't_123',
                senders: [
                    { name: 'Agent X', msgId: 'mid.1' }
                ]
            };

            const result = await agentSyncRepo.processAgentAttribution(payload);
            
            expect(result.success).toBe(true);
            expect(result.updated).toBe(1);
            expect(mockPrisma.message.updateMany).toHaveBeenCalled();
        });
    });
});
