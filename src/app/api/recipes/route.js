import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getAllRecipes, createRecipe } from '@/lib/repositories/recipeRepo';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const isActive = searchParams.get('isActive');

        const data = await getAllRecipes({ category, search, isActive });
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Recipes]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, description, sellingPrice, estimatedCost, category, ingredients, equipment } = body;

        if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

        const recipe = await createRecipe({ name, description, sellingPrice, estimatedCost, category, ingredients, equipment });
        logger.info('[Recipes]', `Created recipe ${recipe.recipeId}`);
        return NextResponse.json(recipe, { status: 201 });
    } catch (error) {
        logger.error('[Recipes]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
