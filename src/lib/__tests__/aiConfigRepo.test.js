import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '@/lib/repositories/aiConfigRepo';
import { getPrisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
    getPrisma: vi.fn(),
}));

describe('aiConfigRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            aIConfig: {
                findMany: vi.fn(),
                upsert: vi.fn(),
            },
            $transaction: vi.fn(),
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getAllAIConfig', () => {
        it('should return defaults merged with DB values', async () => {
            mockPrisma.aIConfig.findMany.mockResolvedValue([
                { key: 'persona', value: 'Custom persona' },
                { key: 'reply_length', value: 'short' },
            ]);

            const result = await repo.getAllAIConfig();

            expect(result.persona).toBe('Custom persona');
            expect(result.reply_length).toBe('short');
            // Other keys should have default values
            expect(result.knowledge).toContain('V School');
        });

        it('should return all defaults when DB has no rows', async () => {
            mockPrisma.aIConfig.findMany.mockResolvedValue([]);
            const result = await repo.getAllAIConfig();
            expect(result.persona).toContain('ผู้ช่วยแอดมิน');
            expect(result.reply_length).toBe('medium');
        });

        it('should return defaults on error', async () => {
            mockPrisma.aIConfig.findMany.mockRejectedValue(new Error('DB error'));
            const result = await repo.getAllAIConfig();
            expect(result.persona).toContain('ผู้ช่วยแอดมิน');
        });
    });

    describe('setAIConfig', () => {
        it('should upsert a valid key', async () => {
            mockPrisma.aIConfig.upsert.mockResolvedValue({ key: 'persona', value: 'New' });
            const result = await repo.setAIConfig('persona', 'New');
            expect(mockPrisma.aIConfig.upsert).toHaveBeenCalledWith({
                where: { key: 'persona' },
                update: { value: 'New' },
                create: { key: 'persona', value: 'New' },
            });
        });

        it('should throw for unknown key', async () => {
            await expect(repo.setAIConfig('unknown_key', 'val'))
                .rejects.toThrow('Unknown AIConfig key: unknown_key');
        });
    });

    describe('setMultipleAIConfig', () => {
        it('should upsert multiple valid keys in transaction', async () => {
            mockPrisma.aIConfig.upsert.mockReturnValue(Promise.resolve({}));
            mockPrisma.$transaction.mockResolvedValue([]);
            await repo.setMultipleAIConfig({ persona: 'A', reply_length: 'long' });

            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
            expect(mockPrisma.aIConfig.upsert).toHaveBeenCalledTimes(2);
        });

        it('should filter out unknown keys', async () => {
            mockPrisma.aIConfig.upsert.mockReturnValue(Promise.resolve({}));
            mockPrisma.$transaction.mockResolvedValue([]);
            await repo.setMultipleAIConfig({ persona: 'A', invalid_key: 'B' });

            // Only 1 upsert call (for persona), invalid_key filtered out
            expect(mockPrisma.aIConfig.upsert).toHaveBeenCalledTimes(1);
        });
    });
});
