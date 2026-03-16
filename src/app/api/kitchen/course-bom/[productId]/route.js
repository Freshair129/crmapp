import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kitchen/course-bom/[productId]
 * Computed CourseBOM — aggregates RecipeIngredient across all CourseMenu entries for the product.
 * Replaces deprecated CourseBOM table (Phase 20).
 *
 * Returns: [{ ingredientId, name, unit, currentStock, minStock, totalQtyPerPerson, recipeCount }]
 */
export async function GET(request, { params }) {
    try {
        const prisma = await getPrisma();

        const menus = await prisma.courseMenu.findMany({
            where: { productId: params.productId },
            include: {
                recipe: {
                    include: {
                        ingredients: {
                            include: {
                                ingredient: {
                                    select: { name: true, unit: true, currentStock: true, minStock: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (menus.length === 0) {
            return NextResponse.json({ success: true, productId: params.productId, data: [] });
        }

        // Aggregate by ingredientId across all recipes/menus
        const aggregated = new Map();

        for (const menu of menus) {
            for (const ri of menu.recipe.ingredients) {
                const qty = ri.qtyPerPerson * (ri.conversionFactor ?? 1);
                const existing = aggregated.get(ri.ingredientId);
                if (existing) {
                    existing.totalQtyPerPerson += qty;
                    existing.recipeCount += 1;
                } else {
                    aggregated.set(ri.ingredientId, {
                        ingredientId: ri.ingredientId,
                        name: ri.ingredient.name,
                        unit: ri.ingredient.unit,
                        currentStock: ri.ingredient.currentStock,
                        minStock: ri.ingredient.minStock,
                        totalQtyPerPerson: qty,
                        recipeCount: 1
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            productId: params.productId,
            data: Array.from(aggregated.values()).sort((a, b) => a.name.localeCompare(b.name))
        });
    } catch (error) {
        logger.error('[CourseBOM]', 'GET computed BOM error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
