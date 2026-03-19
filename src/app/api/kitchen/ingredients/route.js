import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getAllIngredients, upsertIngredient } from '@/lib/repositories/kitchenRepo';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const data = await getAllIngredients({
            category: searchParams.get('category'),
            search: searchParams.get('search'),
            lowStockOnly: searchParams.get('lowStockOnly') === 'true'
        });
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Ingredients]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = await upsertIngredient(body);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error('[Ingredients]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
