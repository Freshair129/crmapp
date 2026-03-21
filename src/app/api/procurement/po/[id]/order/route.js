import { markAsOrdered } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { supplierId, invoiceRef } = body;

    const data = await markAsOrdered(params.id, { supplierId, invoiceRef });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:PO] Mark as ordered failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
