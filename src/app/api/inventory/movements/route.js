import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getMovements, createMovement } from '@/lib/repositories/inventoryRepo';

const VALID_MOVEMENT_TYPES = ['RECEIVE', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getMovements({
      type: searchParams.get('type'),
      productId: searchParams.get('productId'),
      warehouseId: searchParams.get('warehouseId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Movements] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, quantity } = body;

    if (!VALID_MOVEMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Must be one of: ${VALID_MOVEMENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    const data = await createMovement(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error.message === 'Insufficient stock') {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 409 });
    }
    logger.error('[Inventory:Movements] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
