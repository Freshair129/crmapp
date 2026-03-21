import { getTrackingsByPO, createTracking, updateTrackingStatus } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const data = await getTrackingsByPO(params.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Tracking] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { carrier, trackingNumber, estimatedDate, notes, supplierId } = body;

    const data = await createTracking(params.id, {
      carrier,
      trackingNumber,
      estimatedDate,
      notes,
      supplierId,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:Tracking] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { trackingId, status, actualDate } = body;

    const data = await updateTrackingStatus(trackingId, status, actualDate);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Tracking] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
