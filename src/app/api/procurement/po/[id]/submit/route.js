import { submitForReview } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const data = await submitForReview(params.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:PO] Submit for review failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
