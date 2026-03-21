import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getWarehouseById, updateWarehouse } from '@/lib/repositories/inventoryRepo';

export async function GET(request, { params }) {
  try {
    const data = await getWarehouseById(params.id);
    if (!data) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Warehouses] GET by ID failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const data = await updateWarehouse(params.id, body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Warehouses] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
