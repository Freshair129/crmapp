// FILE: src/lib/__tests__/assetRepo.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    getAllAssets, 
    createAsset, 
    updateAsset, 
    getAssetById 
} from '../repositories/assetRepo';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn()
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

/**
 * ## Pre-flight Checklist: assetRepo.js
 * 
 * 1. Source Analysis:
 *    - getAllAssets(opts = {}): Uses object parameter (category, status, search).
 *    - createAsset(data): Uses object parameter.
 *    - updateAsset(id, data): Uses positional (id) and object (data).
 *    - getAssetById(id): Uses positional parameter.
 *    - Internal call: generateAssetId uses CAT_MAP and prisma.asset.findFirst.
 * 
 * 2. Mock Inventory:
 *    - prisma.asset: findFirst, findMany, create, update, findUnique
 */

describe('assetRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            asset: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                findUnique: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);

        // Mock Date for ID generation: 2026-03-15 (Year 2026)
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-15'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('createAsset', () => {
        const input = {
            name: 'MacBook Pro',
            category: 'MARKETING',
            status: 'ACTIVE',
            location: 'Bangkok',
            serialNumber: 'SN12345'
        };

        it('should generate assetId with CAT_MAP prefix and serial starting from 001', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue(null); // No previous asset
            mockPrisma.asset.create.mockImplementation(({ data }) => Promise.resolve({ id: 'uid-1', ...data }));

            const result = await createAsset(input);

            expect(mockPrisma.asset.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { assetId: { startsWith: 'AST-MKT-2026-' } }
            }));
            expect(result.assetId).toBe('AST-MKT-2026-001');
        });

        it('should increment serial number correctly based on last entry', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue({ assetId: 'AST-KTC-2026-012' });
            mockPrisma.asset.create.mockImplementation(({ data }) => Promise.resolve({ id: 'uid-2', ...data }));

            const result = await createAsset({ ...input, category: 'KITCHEN' });

            expect(result.assetId).toBe('AST-KTC-2026-013');
        });

        it('should use first 3 chars with prefix AST for unknown categories', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue(null);
            mockPrisma.asset.create.mockImplementation(({ data }) => Promise.resolve({ id: 'uid-3', ...data }));

            const result = await createAsset({ ...input, category: 'Furniture' });

            expect(result.assetId).toBe('AST-FUR-2026-001');
        });
    });

    describe('getAllAssets', () => {
        it('should build proper where clause for category and search', async () => {
            mockPrisma.asset.findMany.mockResolvedValue([]);
            await getAllAssets({ category: 'OFFICE', search: 'Printer' });

            expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    category: 'OFFICE',
                    OR: [
                        { name: { contains: 'Printer', mode: 'insensitive' } },
                        { assetId: { contains: 'Printer', mode: 'insensitive' } },
                        { serialNumber: { contains: 'Printer', mode: 'insensitive' } }
                    ]
                }
            }));
        });
    });

    describe('updateAsset', () => {
        it('should update specific fields and handle dates', async () => {
            mockPrisma.asset.update.mockResolvedValue({ id: '1', status: 'REPAIRED' });
            
            await updateAsset('1', { 
                status: 'REPAIRED', 
                lastServiceDate: '2026-03-01',
                notes: 'Screen replacement'
            });

            expect(mockPrisma.asset.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: '1' },
                data: expect.objectContaining({
                    status: 'REPAIRED',
                    notes: 'Screen replacement',
                    lastServiceDate: new Date('2026-03-01')
                })
            }));
        });
    });

    describe('getAssetById', () => {
        it('should fetch asset with assignedTo inclusion', async () => {
            mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', name: 'Asset' });
            await getAssetById('a1');

            expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
                where: { id: 'a1' },
                include: { assignedTo: true }
            });
        });
    });
});
