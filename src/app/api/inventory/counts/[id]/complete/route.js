import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { completeStockCount } from '@/lib/repositories/inventoryRepo';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { approvedById } = body;
    const data = await completeStockCount(params.id, approvedById);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Counts] Complete failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
