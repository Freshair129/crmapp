import { approvePO } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { approverId, action, reason } = body;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    const data = await approvePO(params.id, approverId, action, reason);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:PO] Approve failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
