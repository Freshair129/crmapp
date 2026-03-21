import { getIssuesByPO, createIssue, resolveIssue } from '@/lib/repositories/procurementRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const data = await getIssuesByPO(params.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Issues] GET failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { issueType, description, severity, reportedById } = body;

    const data = await createIssue(params.id, {
      issueType,
      description,
      severity,
      reportedById,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('[Procurement:Issues] POST failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { issueId, resolution } = body;

    const data = await resolveIssue(issueId, resolution);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('[Procurement:Issues] PATCH failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
