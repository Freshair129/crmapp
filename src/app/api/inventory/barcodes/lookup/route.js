import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { lookupByBarcode } from '@/lib/repositories/inventoryRepo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }
    const data = await lookupByBarcode(code);
    if (!data) {
      return NextResponse.json({ error: 'Barcode not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Barcodes] Lookup failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
