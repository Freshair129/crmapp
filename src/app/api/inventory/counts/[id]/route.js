import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getStockCountById, addCountItem } from '@/lib/repositories/inventoryRepo';

export async function GET(request, { params }) {
  try {
    const data = await getStockCountById(params.id);
    if (!data) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Counts] GET by ID failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { productId, physicalQty } = body;
    const data = await addCountItem(params.id, { productId, physicalQty });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Counts] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
