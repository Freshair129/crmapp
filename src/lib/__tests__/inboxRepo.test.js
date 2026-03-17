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
                update: vi.fn(),
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
            expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    channel: { equals: 'fb', mode: 'insensitive' }
                })
            }));
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
