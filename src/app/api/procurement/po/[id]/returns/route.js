import { createReturn, updateReturnStatus } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { supplierId, reason, items, returnedById } = body;

    const data = await createReturn(params.id, {
      supplierId,
      reason,
      items,
      returnedById,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:Returns] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { returnId, status } = body;

    const data = await updateReturnStatus(returnId, status);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Returns] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
