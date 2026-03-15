import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { updateStock, upsertIngredient } from '@/lib/repositories/kitchenRepo';

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { currentStock, ...rest } = body;

        if (currentStock !== undefined) {
            const result = await updateStock(params.id, Number(currentStock));
            return NextResponse.json(result);
        }

        const result = await upsertIngredient({ ingredientId: params.id, ...rest });
        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Ingredients]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
