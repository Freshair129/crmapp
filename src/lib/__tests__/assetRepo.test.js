// FILE: src/lib/__tests__/assetRepo.test.js
/**
 * ## Pre-flight: assetRepo.js
 * Models used:
 *   - prisma.asset (findFirst, findMany, create, update, findUnique)
 * Internal calls:
 *   - createAsset() calls generateAssetId(category) → mock prisma.asset.findFirst
 * Function signatures:
 *   - createAsset({ name, category, status, location, ... })
 * Potential mock gaps: purchasePrice conversion to Number.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAsset } from '../repositories/assetRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

describe('assetRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            asset: {
                findFirst: vi.fn(),
                create: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-20'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('assetId generation via createAsset', () => {
        it('should use MKT for MARKETING and start with 001', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue(null);
            
            await createAsset({ name: 'Webcam', category: 'MARKETING' });

            expect(mockPrisma.asset.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    assetId: 'AST-MKT-2026-001'
                })
            }));
        });

        it('should use first 3 chars for unknown category (toUpperCase)', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue(null);
            
            await createAsset({ name: 'Drill', category: 'tools' });

            expect(mockPrisma.asset.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    assetId: 'AST-TOO-2026-001'
                })
            }));
        });

        it('should increment serial based on last ID found', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue({ assetId: 'AST-GEN-2026-099' });
            
            await createAsset({ name: 'Chairs', category: 'OFFICE' }); // CAT_MAP[OFFICE] = OFF

            expect(mockPrisma.asset.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    assetId: 'AST-OFF-2026-100'
                })
            }));
        });

        it('should convert price to Number', async () => {
            mockPrisma.asset.findFirst.mockResolvedValue(null);
            
            await createAsset({ name: 'Monitor', purchasePrice: '12500.50' });

            expect(mockPrisma.asset.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    purchasePrice: 12500.50
                })
            }));
        });
    });
});
