import { calculateClassBOM, createPOFromBOM } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const data = await calculateClassBOM(params.classId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:BOM] Calculate BOM failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { createdById } = body;

    const data = await createPOFromBOM(params.classId, createdById);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:BOM] Create PO from BOM failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
