import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getBarcodesByProduct, registerBarcode } from '@/lib/repositories/inventoryRepo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }
    const data = await getBarcodesByProduct(productId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Barcodes] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, barcode, type, isPrimary } = body;
    const data = await registerBarcode({ productId, barcode, type, isPrimary });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Inventory:Barcodes] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
