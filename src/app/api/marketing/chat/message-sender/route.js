import { NextResponse } from 'next/server';
import { processAgentAttribution } from '@/lib/repositories/agentSyncRepo';

/**
 * POST /api/marketing/chat/message-sender
 * Called by sync_agents_v5.js (Playwright scraper)
 *
 * Body:
 *   conversationId      string                  FB thread ID (t_xxx)
 *   senders             [{ name, msgId?, msgText? }]
 *   participantId?      string                  PSID from Business Suite URL (v5)
 *   newConversationId?  string                  Learned UID after redirect (v5)
 */
export async function POST(req) {
  try {
    const { conversationId, senders, participantId, newConversationId } = await req.json();

    if (!conversationId || !Array.isArray(senders) || senders.length === 0) {
      return NextResponse.json(
        { error: 'conversationId and senders[] required' },
        { status: 400 }
      );
    }

    const result = await processAgentAttribution({
      conversationId,
      senders,
      participantId,
      newConversationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[message-sender] POST error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
