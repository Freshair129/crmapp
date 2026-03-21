import { createGRN } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { receivedById, isPartial, supplierId, notes, items } = body;

    const data = await createGRN(params.id, {
      receivedById,
      isPartial,
      supplierId,
      notes,
      items,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:GRN] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
