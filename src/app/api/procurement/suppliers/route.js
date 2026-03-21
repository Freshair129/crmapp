import { getAllSuppliers, createSupplier } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const data = await getAllSuppliers({
      isActive: isActive !== null ? isActive === 'true' : undefined,
      search: search || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Suppliers] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await createSupplier(body);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:Suppliers] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
