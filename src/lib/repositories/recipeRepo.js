import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateRecipeId } from '@/lib/idGenerators';

// generateRecipeId — moved to @/lib/idGenerators

export async function getAllRecipes(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { category, search, isActive } = opts;

        const where = {};
        if (category) where.category = category;
        if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
        if (search) where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { recipeId: { contains: search, mode: 'insensitive' } }
        ];

        return prisma.recipe.findMany({
            where,
            include: {
                ingredients: { include: { ingredient: true } },
                equipment: true,
                courseMenus: { include: { product: { select: { id: true, name: true, productId: true } } } }
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to get recipes', error);
        throw error;
    }
}

export async function getRecipeById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredients: { include: { ingredient: true } },
                equipment: true,
                courseMenus: { include: { product: true } }
            }
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to get recipe by id', error);
        throw error;
    }
}

export async function createRecipe({ name, description, sellingPrice, estimatedCost, category, ingredients = [], equipment = [] }) {
    try {
        const prisma = await getPrisma();
        const recipeId = await generateRecipeId();

        return prisma.recipe.create({
            data: {
                recipeId,
                name,
                description,
                sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
                estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
                category,
                ingredients: {
                    create: ingredients.map(i => ({
                        ingredientId: i.ingredientId,
                        qtyPerPerson: Number(i.qtyPerPerson),
                        unit: i.unit
                    }))
                },
                equipment: {
                    create: equipment.map(e => ({
                        name: e.name,
                        unit: e.unit || 'piece',
                        qtyRequired: Number(e.qtyRequired),
                        currentStock: Number(e.currentStock ?? 0),
                        minStock: Number(e.minStock ?? 0),
                        notes: e.notes
                    }))
                }
            },
            include: {
                ingredients: { include: { ingredient: true } },
                equipment: true
            }
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to create recipe', error);
        throw error;
    }
}

export async function updateRecipe(id, data) {
    try {
        const prisma = await getPrisma();
        return prisma.recipe.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : null }),
                ...(data.estimatedCost !== undefined && { estimatedCost: data.estimatedCost ? Number(data.estimatedCost) : null }),
            },
            include: {
                ingredients: { include: { ingredient: true } },
                equipment: true,
                courseMenus: { include: { product: true } }
            }
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to update recipe', error);
        throw error;
    }
}

export async function addCourseMenu(productId, recipeId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseMenu.create({
            data: { productId, recipeId },
            include: { recipe: true, product: true }
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to add course menu', error);
        throw error;
    }
}

export async function removeCourseMenu(productId, recipeId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseMenu.delete({
            where: { productId_recipeId: { productId, recipeId } }
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to remove course menu', error);
        throw error;
    }
}

export async function getMenusByProduct(productId) {
    try {
        const prisma = await getPrisma();
        return prisma.courseMenu.findMany({
            where: { productId },
            include: {
                recipe: {
                    include: {
                        ingredients: { include: { ingredient: true } },
                        equipment: true
                    }
                }
            },
            orderBy: { sortOrder: 'asc' }
        });
    } catch (error) {
        logger.error('[RecipeRepo]', 'Failed to get menus by product', error);
        throw error;
    }
}
