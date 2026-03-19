import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as inboxRepo from '@/lib/repositories/inboxRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

describe('inboxRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            conversation: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
                upsert: vi.fn(),
                updateMany: vi.fn(),
            },
            message: {
                findMany: vi.fn(),
                create: vi.fn(),
            },
            $transaction: vi.fn((cb) => cb(mockPrisma)),
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getConversations', () => {
        it('should fetch and format conversations correctly', async () => {
            const mockDate = new Date();
            mockPrisma.conversation.findMany.mockResolvedValue([
                {
                    id: 'conv-1',
                    conversationId: 't_123',
                    channel: 'facebook',
                    status: 'open',
                    updatedAt: mockDate,
                    customer: {
                        customerId: 'CUS-1',
                        firstName: 'John',
                        lastName: 'Doe',
                        phonePrimary: '123456',
                    },
                    messages: [{ content: 'Hello', createdAt: mockDate, fromId: 'user-1' }]
                }
            ]);

            const result = await inboxRepo.getConversations({ channel: 'FB', status: 'open' });

            expect(result).toHaveLength(1);
            expect(result[0].customer.firstName).toBe('John');
            expect(result[0].lastMessage.text).toBe('Hello');
        });
    });

    describe('updateConversationByExternalId', () => {
        it('should update by conversationId', async () => {
            mockPrisma.conversation.update.mockResolvedValue({ id: 'uuid-1' });
            await inboxRepo.updateConversationByExternalId('t_123', { unreadCount: 0 });
            expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
                where: { conversationId: 't_123' },
                data: { unreadCount: 0 }
            });
        });
    });

    describe('getConversationByExternalId', () => {
        it('should fetch by conversationId', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'uuid-1', conversationId: 't_123' });
            const result = await inboxRepo.getConversationByExternalId('t_123');
            expect(result.id).toBe('uuid-1');
            expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
                where: { conversationId: 't_123' }
            });
        });
    });

    describe('upsertConversationByExternalId', () => {
        it('should upsert by conversationId', async () => {
            mockPrisma.conversation.upsert.mockResolvedValue({ id: 'uuid-1' });
            await inboxRepo.upsertConversationByExternalId('t_123', { channel: 'facebook' });
            expect(mockPrisma.conversation.upsert).toHaveBeenCalledWith({
                where: { conversationId: 't_123' },
                create: { conversationId: 't_123', channel: 'facebook' },
                update: { channel: 'facebook' }
            });
        });
    });

    describe('getConversationInternalId', () => {
        it('should return id from conversationId', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'uuid-1' });
            const result = await inboxRepo.getConversationInternalId('t_123');
            expect(result).toBe('uuid-1');
        });

        it('should return undefined if not found', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue(null);
            const result = await inboxRepo.getConversationInternalId('t_123');
            expect(result).toBeUndefined();
        });
    });

    describe('getConversationWithDetail', () => {
        it('should fetch with inclusions', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'uuid-1', customer: { id: 'c1' } });
            const result = await inboxRepo.getConversationWithDetail('uuid-1');
            expect(result.customer).toBeDefined();
            expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                include: expect.any(Object)
            }));
        });
    });


    describe('getMarketingChatMessages', () => {
        it('should fetch and format for marketing chat', async () => {
            mockPrisma.message.findMany.mockResolvedValue([
                { id: 'm1', content: 'HI', fromId: 'u1', responderId: null, createdAt: new Date() }
            ]);
            const result = await inboxRepo.getMarketingChatMessages('t_123');
            expect(result).toHaveLength(1);
            expect(result[0].senderType).toBe('CUSTOMER');
        });
    });

    describe('getConversationsWithCursor', () => {
        it('should handle cursor pagination', async () => {
            mockPrisma.conversation.findMany.mockResolvedValue([
                { id: 'c1', lastMessageAt: new Date() },
                { id: 'c2', lastMessageAt: new Date() }
            ]);
            const result = await inboxRepo.getConversationsWithCursor({ limit: 1 });
            expect(result.rows).toHaveLength(1);
            expect(result.hasMore).toBe(true);
            expect(result.nextCursor).toBe('c1');
        });
    });

    describe('getConversationMessages', () => {
        it('should fetch paginated messages and return hasMore', async () => {
            const mockMessages = Array(11).fill(null).map((_, i) => ({
                id: `m-${i}`,
                messageId: `mid-${i}`,
                content: `msg ${i}`,
                fromId: 'user-1',
                createdAt: new Date(),
            }));
            mockPrisma.message.findMany.mockResolvedValue(mockMessages);

            const result = await inboxRepo.getConversationMessages('conv-1', { limit: 10 });

            expect(result.messages).toHaveLength(10);
            expect(result.hasMore).toBe(true);
            expect(result.messages[0].text).toBe('msg 9'); // reversed from descending
        });
    });

    describe('postReply', () => {
        it('should create a message and update conversation in a transaction', async () => {
            mockPrisma.message.create.mockResolvedValue({
                id: 'new-msg-id',
                messageId: 'm_123',
                content: 'Response',
                fromId: 'system',
                createdAt: new Date(),
            });

            const result = await inboxRepo.postReply('conv-1', { text: 'Response', responderId: 'emp-1' });

            expect(result.text).toBe('Response');
            expect(mockPrisma.message.create).toHaveBeenCalled();
            expect(mockPrisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'conv-1' }
            }));
        });
    });
});


