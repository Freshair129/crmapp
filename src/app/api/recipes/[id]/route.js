import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getRecipeById, updateRecipe } from '@/lib/repositories/recipeRepo';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const recipe = await getRecipeById(params.id);
        if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

        return NextResponse.json(recipe);
    } catch (error) {
        logger.error('[Recipes]', 'GET by ID failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const updated = await updateRecipe(params.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        logger.error('[Recipes]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
