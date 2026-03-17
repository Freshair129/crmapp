// FILE: src/lib/__tests__/syncMasterData.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/sheets/sync-master-data/route';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { upsertIngredient } from '@/lib/repositories/kitchenRepo';
import { getServerSession } from 'next-auth';

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

vi.mock('@/lib/repositories/kitchenRepo', () => ({
    upsertIngredient: vi.fn()
}));

vi.mock('next-auth', () => ({
    getServerSession: vi.fn()
}));

/**
 * ## Pre-flight Checklist: sync-master-data/route.js
 * 
 * 1. Source Analysis:
 *    - POST(request): Main handler.
 *    - Internal parseCSV function: split(/\r?\n/), then split(',').
 *    - Sequential: Courses -> Ingredients -> BOM -> Assets.
 *    - BOM Logic: Requires findUnique product and ingredient before upsertBOM.
 * 
 * 2. Mock Inventory:
 *    - getServerSession: Auth check.
 *    - fetch: Global fetch for SHEET URLs.
 *    - prisma.product: upsert, findUnique.
 *    - prisma.ingredient: findUnique.
 *    - prisma.asset: upsert.
 *    - upsertIngredient, upsertBOM: Repositories.
 */

describe('Sync Master Data API', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            product: {
                upsert: vi.fn(),
                findUnique: vi.fn()
            },
            ingredient: {
                findUnique: vi.fn()
            },
            asset: {
                upsert: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);
        
        // Auth Mock
        getServerSession.mockResolvedValue({ user: { name: 'Admin' } });

        // Global Fetch Mock
        global.fetch = vi.fn();

        // Env Mocks
        process.env.SHEET_COURSES_URL = 'http://courses';
        process.env.SHEET_INGREDIENTS_URL = 'http://ingredients';
        process.env.SHEET_BOM_URL = 'http://bom';
        process.env.SHEET_ASSETS_URL = 'http://assets';
    });

    it('should return 401 if no session', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await POST({});
        expect(res.status).toBe(401);
    });

    it('should sync courses and ingredients correctly', async () => {
        // Mock Courses CSV
        fetch.mockResolvedValueOnce({
            text: () => Promise.resolve("productId,name,price\nPROD-1,Sushi Course,1500")
        });
        // Mock Ingredients CSV
        fetch.mockResolvedValueOnce({
            text: () => Promise.resolve("ingredientId,name,unit\nING-1,Salmon,kg")
        });
        // Mock BOM CSV (Empty)
        fetch.mockResolvedValueOnce({ text: () => Promise.resolve("productId,ingredientId\n") });
        // Mock Assets CSV (Empty)
        fetch.mockResolvedValueOnce({ text: () => Promise.resolve("assetId,name\n") });

        const res = await POST({});
        const data = await res.json();

        expect(data.synced.courses).toBe(1);
        expect(data.synced.ingredients).toBe(1);
        expect(mockPrisma.product.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { productId: 'PROD-1' },
            create: expect.objectContaining({ name: 'Sushi Course', price: 1500 })
        }));
        expect(upsertIngredient).toHaveBeenCalledWith(expect.objectContaining({
            ingredientId: 'ING-1',
            name: 'Salmon'
        }));
    });

    it('should log deprecation warning and skip BOM sync (CourseBOM removed in Phase 20)', async () => {
        // BOM sync is deprecated — CourseBOM table was dropped. Route logs warning and skips.
        process.env.SHEET_COURSES_URL = '';
        process.env.SHEET_INGREDIENTS_URL = '';
        process.env.SHEET_ASSETS_URL = '';

        const res = await POST({});
        await res.json();

        expect(logger.warn).toHaveBeenCalledWith(
            '[SyncMasterData]',
            expect.stringContaining('CourseBOM was removed in Phase 20')
        );
        // No fetch call for BOM should happen (data is ignored)
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle assets sync correctly', async () => {
        process.env.SHEET_COURSES_URL = '';
        process.env.SHEET_INGREDIENTS_URL = '';
        process.env.SHEET_BOM_URL = '';

        fetch.mockResolvedValueOnce({
            text: () => Promise.resolve("assetId,name,purchasePrice\nAST-001,Kitchen Knife,2500")
        });

        const res = await POST({});
        const data = await res.json();

        expect(data.synced.assets).toBe(1);
        expect(mockPrisma.asset.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { assetId: 'AST-001' },
            create: expect.objectContaining({ purchasePrice: 2500 })
        }));
    });
});
