import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { updateStock, upsertIngredient } from '@/lib/repositories/kitchenRepo';

export async function PATCH(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { currentStock, yieldPercent, ...rest } = body;

        // Validate yieldPercent when provided
        if (yieldPercent !== undefined) {
            const yp = Number(yieldPercent);
            if (isNaN(yp) || yp <= 0 || yp > 100) {
                return NextResponse.json({ error: 'yieldPercent must be between 1 and 100' }, { status: 400 });
            }
        }

        if (currentStock !== undefined && Object.keys(rest).length === 0 && yieldPercent === undefined) {
            // Quick stock-only update path
            const result = await updateStock(params.id, Number(currentStock));
            return NextResponse.json(result);
        }

        // General update — includes yieldPercent and/or other fields
        const result = await upsertIngredient({
            ingredientId: params.id,
            ...(currentStock !== undefined ? { currentStock: Number(currentStock) } : {}),
            ...(yieldPercent !== undefined ? { yieldPercent: Number(yieldPercent) } : {}),
            ...rest
        });
        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Ingredients]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
