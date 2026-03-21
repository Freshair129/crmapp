import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAllWarehouses, createWarehouse } from '@/lib/repositories/inventoryRepo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const data = await getAllWarehouses({ isActive });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Warehouses] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, code, address } = body;
    const data = await createWarehouse({ name, code, address });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Inventory:Warehouses] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
