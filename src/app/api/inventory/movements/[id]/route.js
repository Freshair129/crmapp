import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getMovementById } from '@/lib/repositories/inventoryRepo';

export async function GET(request, { params }) {
  try {
    const data = await getMovementById(params.id);
    if (!data) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Movements] GET by ID failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
