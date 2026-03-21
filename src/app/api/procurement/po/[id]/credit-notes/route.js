import { createCreditNote, updateCreditNoteStatus } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { supplierId, returnId, amount, reason } = body;

    const data = await createCreditNote(params.id, {
      supplierId,
      returnId,
      amount,
      reason,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:CreditNotes] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { creditNoteId, status, receivedAt } = body;

    const data = await updateCreditNoteStatus(creditNoteId, status, receivedAt);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:CreditNotes] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
