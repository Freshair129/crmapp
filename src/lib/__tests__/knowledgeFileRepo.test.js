import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '@/lib/repositories/knowledgeFileRepo';
import { getPrisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
    getPrisma: vi.fn(),
}));

describe('knowledgeFileRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            knowledgeFile: {
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('listKnowledgeFiles', () => {
        it('should list all files by default', async () => {
            mockPrisma.knowledgeFile.findMany.mockResolvedValue([]);
            await repo.listKnowledgeFiles();
            expect(mockPrisma.knowledgeFile.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: undefined })
            );
        });

        it('should filter active only when requested', async () => {
            mockPrisma.knowledgeFile.findMany.mockResolvedValue([]);
            await repo.listKnowledgeFiles({ activeOnly: true });
            expect(mockPrisma.knowledgeFile.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isActive: true } })
            );
        });

        it('should return empty array on error', async () => {
            mockPrisma.knowledgeFile.findMany.mockRejectedValue(new Error('DB'));
            const result = await repo.listKnowledgeFiles();
            expect(result).toEqual([]);
        });
    });

    describe('getActiveFilesWithContent', () => {
        it('should return active files with content fields', async () => {
            const files = [{ id: '1', filename: 'test.txt', contentText: 'hello' }];
            mockPrisma.knowledgeFile.findMany.mockResolvedValue(files);

            const result = await repo.getActiveFilesWithContent();
            expect(result).toEqual(files);
            expect(mockPrisma.knowledgeFile.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { isActive: true },
                    select: expect.objectContaining({ contentText: true, contentB64: true }),
                })
            );
        });

        it('should return empty array on error', async () => {
            mockPrisma.knowledgeFile.findMany.mockRejectedValue(new Error('DB'));
            const result = await repo.getActiveFilesWithContent();
            expect(result).toEqual([]);
        });
    });

    describe('createKnowledgeFile', () => {
        it('should create a knowledge file', async () => {
            const created = { id: '1', filename: 'doc.txt' };
            mockPrisma.knowledgeFile.create.mockResolvedValue(created);

            const result = await repo.createKnowledgeFile({
                filename: 'doc.txt',
                fileType: 'text',
                mimeType: 'text/plain',
                contentText: 'content',
                contentB64: null,
                sizeBytes: 100,
            });
            expect(result).toEqual(created);
        });
    });

    describe('toggleKnowledgeFile', () => {
        it('should toggle isActive', async () => {
            mockPrisma.knowledgeFile.update.mockResolvedValue({ id: '1', isActive: false });
            await repo.toggleKnowledgeFile('1', false);
            expect(mockPrisma.knowledgeFile.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { isActive: false },
                select: { id: true, filename: true, isActive: true },
            });
        });
    });

    describe('deleteKnowledgeFile', () => {
        it('should delete by id', async () => {
            mockPrisma.knowledgeFile.delete.mockResolvedValue({ id: '1' });
            await repo.deleteKnowledgeFile('1');
            expect(mockPrisma.knowledgeFile.delete).toHaveBeenCalledWith({ where: { id: '1' } });
        });
    });
});
