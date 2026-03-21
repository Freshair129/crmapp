import { getAllPurchaseOrders, createPurchaseOrder } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const classId = searchParams.get('classId');
    const supplierId = searchParams.get('supplierId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const data = await getAllPurchaseOrders({
      status: status || undefined,
      classId: classId || undefined,
      supplierId: supplierId || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:PO] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { classId, supplierId, items, notes, createdById } = body;
    const data = await createPurchaseOrder({ classId, supplierId, items, notes, createdById });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:PO] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
