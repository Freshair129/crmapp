import {
  getAdvancesByPO,
  getPendingAdvances,
  createAdvance,
  approveAdvance,
  reimburseAdvance,
} from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('poId');

    const data = poId
      ? await getAdvancesByPO(poId)
      : await getPendingAdvances();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Advances] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { poId, paidById, amount, description, receiptImage } = body;

    const data = await createAdvance({
      poId,
      paidById,
      amount,
      description,
      receiptImage,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:Advances] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { advanceId, action, userId } = body;

    let data;
    if (action === 'approve') {
      data = await approveAdvance(advanceId, userId);
    } else if (action === 'reimburse') {
      data = await reimburseAdvance(advanceId, userId);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reimburse' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Advances] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
