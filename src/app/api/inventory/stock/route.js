import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getStockLevels } from '@/lib/repositories/inventoryRepo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const lowStockOnly = searchParams.get('lowStockOnly');
    const data = await getStockLevels({ warehouseId, productId, lowStockOnly });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Stock] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
