import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getStockCounts, createStockCount } from '@/lib/repositories/inventoryRepo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const data = await getStockCounts({ warehouseId, status });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Counts] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { warehouseId, countedById, notes } = body;
    const data = await createStockCount({ warehouseId, countedById, notes });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Inventory:Counts] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
