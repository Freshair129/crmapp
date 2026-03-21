import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getLowStockAlerts } from '@/lib/repositories/inventoryRepo';

export async function GET() {
  try {
    const data = await getLowStockAlerts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Inventory:Alerts] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
