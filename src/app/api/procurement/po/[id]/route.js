import { getPurchaseOrderById } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const data = await getPurchaseOrderById(params.id);

    if (!data) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:PO] GET by ID failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
