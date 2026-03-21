import { getSupplierById, updateSupplier } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const data = await getSupplierById(params.id);

    if (!data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Suppliers] GET by ID failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const data = await updateSupplier(params.id, body);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Suppliers] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
