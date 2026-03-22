import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getStockLevels } from '@/lib/repositories/inventoryRepo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId  = searchParams.get('warehouseId')  || null;
    const productId    = searchParams.get('productId')    || null;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const search       = searchParams.get('search')       || null;
    const page         = parseInt(searchParams.get('page')  ?? '1',  10);
    const limit        = parseInt(searchParams.get('limit') ?? '25', 10);

    const result = await getStockLevels({ warehouseId, productId, lowStockOnly, search, page, limit });

    return NextResponse.json({
      success:    true,
      data:       result.data,
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    logger.error('[Inventory:Stock] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
