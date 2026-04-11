import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '@/lib/repositories/intelligenceRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@google/generative-ai', () => {
    class MockGoogleGenerativeAI {
        constructor() {}
        getGenerativeModel() {
            return {
                generateContent: vi.fn().mockResolvedValue({
                    response: {
                        text: () => JSON.stringify({
                            summary: 'Test summary',
                            keyTakeaways: ['takeaway 1'],
                            sentiment: 'POSITIVE',
                            intent: 'INQUIRY',
                            treeCode: 'graph TD\n  A --> B',
                        }),
                    },
                }),
            };
        }
    }
    return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

describe('intelligenceRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            conversationIntelligence: {
                findFirst: vi.fn(),
                create: vi.fn(),
            },
            message: {
                findMany: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getLatestAnalysis', () => {
        it('should find the latest analysis for a conversation', async () => {
            const analysis = { id: 'a1', summary: 'Test' };
            mockPrisma.conversationIntelligence.findFirst.mockResolvedValue(analysis);

            const result = await repo.getLatestAnalysis('conv-1');

            expect(result).toEqual(analysis);
            expect(mockPrisma.conversationIntelligence.findFirst).toHaveBeenCalledWith({
                where: { conversationId: 'conv-1' },
                orderBy: { date: 'desc' },
            });
        });

        it('should throw on error', async () => {
            mockPrisma.conversationIntelligence.findFirst.mockRejectedValue(new Error('DB'));
            await expect(repo.getLatestAnalysis('conv-1')).rejects.toThrow('DB');
        });
    });

    describe('generateChatAnalysis', () => {
        it('should return null when no messages', async () => {
            mockPrisma.message.findMany.mockResolvedValue([]);
            const result = await repo.generateChatAnalysis('conv-1');
            expect(result).toBeNull();
        });

        it('should generate analysis and save to DB', async () => {
            mockPrisma.message.findMany.mockResolvedValue([
                { senderType: 'CUSTOMER', content: 'สวัสดี', createdAt: new Date() },
                { senderType: 'ADMIN', content: 'สวัสดีค่ะ', createdAt: new Date() },
            ]);
            const savedAnalysis = { id: 'a1', summary: 'Test summary' };
            mockPrisma.conversationIntelligence.create.mockResolvedValue(savedAnalysis);

            const result = await repo.generateChatAnalysis('conv-1');

            expect(mockPrisma.conversationIntelligence.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    conversationId: 'conv-1',
                    summary: 'Test summary',
                    sentiment: 'POSITIVE',
                    intent: 'INQUIRY',
                }),
            });
            expect(result).toEqual(savedAnalysis);
        });
    });
});
