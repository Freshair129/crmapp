import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllRecipes, getRecipeById, createRecipe } from '../repositories/recipeRepo';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { getPrisma } = await import('@/lib/db');

describe('recipeRepo', () => {
    let prisma;

    beforeEach(() => {
        vi.clearAllMocks();
        prisma = {
            recipe: {
                findMany: vi.fn().mockResolvedValue([]),
                findUnique: vi.fn().mockResolvedValue(null),
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: 'new-id', recipeId: 'RCP-2026-001' })
            }
        };
        getPrisma.mockResolvedValue(prisma);
    });

    // ─── getAllRecipes ──────────────────────────────────────────────────────────

    describe('getAllRecipes', () => {
        it('should call findMany with no filters when opts is empty', async () => {
            await getAllRecipes({});
            expect(prisma.recipe.findMany).toHaveBeenCalledOnce();
            const call = prisma.recipe.findMany.mock.calls[0][0];
            expect(call.where).toEqual({});
        });

        it('should filter by category', async () => {
            await getAllRecipes({ category: 'JP' });
            const call = prisma.recipe.findMany.mock.calls[0][0];
            expect(call.where.category).toBe('JP');
        });

        it('should add OR filter when search is provided', async () => {
            await getAllRecipes({ search: 'ราเมน' });
            const call = prisma.recipe.findMany.mock.calls[0][0];
            expect(call.where.OR).toBeDefined();
            expect(call.where.OR[0].name.contains).toBe('ราเมน');
        });

        it('should filter isActive when provided as boolean true', async () => {
            await getAllRecipes({ isActive: true });
            const call = prisma.recipe.findMany.mock.calls[0][0];
            expect(call.where.isActive).toBe(true);
        });

        it('should parse isActive string "true" as boolean true', async () => {
            await getAllRecipes({ isActive: 'true' });
            const call = prisma.recipe.findMany.mock.calls[0][0];
            expect(call.where.isActive).toBe(true);
        });

        it('should return array from findMany', async () => {
            const mockData = [{ id: 'r1', name: 'Test' }];
            prisma.recipe.findMany.mockResolvedValue(mockData);
            const result = await getAllRecipes({});
            expect(result).toEqual(mockData);
        });
    });

    // ─── getRecipeById ──────────────────────────────────────────────────────────

    describe('getRecipeById', () => {
        it('should call findUnique with the provided id', async () => {
            await getRecipeById('test-uuid');
            expect(prisma.recipe.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'test-uuid' } })
            );
        });

        it('should return the recipe when found', async () => {
            const mockRecipe = { id: 'r1', recipeId: 'RCP-2026-001', name: 'ราเมน' };
            prisma.recipe.findUnique.mockResolvedValue(mockRecipe);
            const result = await getRecipeById('r1');
            expect(result).toEqual(mockRecipe);
        });

        it('should return null when recipe does not exist', async () => {
            prisma.recipe.findUnique.mockResolvedValue(null);
            const result = await getRecipeById('non-existent');
            expect(result).toBeNull();
        });
    });

    // ─── createRecipe ───────────────────────────────────────────────────────────

    describe('createRecipe', () => {
        it('should generate recipeId starting with RCP- and current year', async () => {
            prisma.recipe.findFirst.mockResolvedValue(null); // no existing recipes
            await createRecipe({ name: 'ซูชิ' });

            const call = prisma.recipe.create.mock.calls[0][0];
            expect(call.data.recipeId).toMatch(/^RCP-\d{4}-\d{3}$/);
            expect(call.data.recipeId).toContain(new Date().getFullYear().toString());
        });

        it('should increment serial from last recipeId', async () => {
            prisma.recipe.findFirst.mockResolvedValue({ recipeId: 'RCP-2026-005' });
            await createRecipe({ name: 'ราเมน' });

            const call = prisma.recipe.create.mock.calls[0][0];
            expect(call.data.recipeId).toBe('RCP-2026-006');
        });

        it('should create with ingredients nested', async () => {
            const ingredients = [
                { ingredientId: 'ing-1', qtyPerPerson: 200, unit: 'กรัม' }
            ];
            await createRecipe({ name: 'ราเมน', ingredients });

            const call = prisma.recipe.create.mock.calls[0][0];
            expect(call.data.ingredients.create).toHaveLength(1);
            expect(call.data.ingredients.create[0].ingredientId).toBe('ing-1');
            expect(call.data.ingredients.create[0].qtyPerPerson).toBe(200);
        });

        it('should create with equipment nested', async () => {
            const equipment = [
                { name: 'หม้อราเมน', unit: 'ใบ', qtyRequired: 2, currentStock: 5, minStock: 2 }
            ];
            await createRecipe({ name: 'ราเมน', equipment });

            const call = prisma.recipe.create.mock.calls[0][0];
            expect(call.data.equipment.create).toHaveLength(1);
            expect(call.data.equipment.create[0].name).toBe('หม้อราเมน');
            expect(call.data.equipment.create[0].qtyRequired).toBe(2);
        });

        it('should handle empty ingredients and equipment arrays', async () => {
            await createRecipe({ name: 'ราเมน', ingredients: [], equipment: [] });
            const call = prisma.recipe.create.mock.calls[0][0];
            expect(call.data.ingredients.create).toHaveLength(0);
            expect(call.data.equipment.create).toHaveLength(0);
        });

        it('should convert sellingPrice to Number', async () => {
            await createRecipe({ name: 'ราเมน', sellingPrice: '450' });
            const call = prisma.recipe.create.mock.calls[0][0];
            expect(typeof call.data.sellingPrice).toBe('number');
            expect(call.data.sellingPrice).toBe(450);
        });

        it('should throw and propagate errors from prisma', async () => {
            prisma.recipe.create.mockRejectedValue(new Error('DB error'));
            await expect(createRecipe({ name: 'ราเมน' })).rejects.toThrow('DB error');
        });
    });
});
