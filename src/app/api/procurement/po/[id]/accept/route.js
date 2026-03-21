import { acceptPO } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { purchaserId, orderDate, expectedDeliveryDate, actualOrderRef, notes } = body;

    const data = await acceptPO(params.id, {
      purchaserId,
      orderDate,
      expectedDeliveryDate,
      actualOrderRef,
      notes,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:PO] Accept failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
