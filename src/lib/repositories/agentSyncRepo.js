/**
 * agentSyncRepo.js
 * Repository layer for sync_agents_v5.js Playwright scraper attribution.
 *
 * Handles:
 *  - Employee name → ID resolution (FB identity → nickName → firstName)
 *  - Message-level attribution by msgId (precise) or msgText (fuzzy)
 *  - Conversation-level fallback: assignedAgent + assignedEmployeeId
 *  - Conversation ID learning: newConversationId (UID) + participantId (PSID) mapping
 */

import { getPrisma } from '@/lib/db';
import { bestMatchScore } from '@/lib/thaiNameMatcher';

// ── Employee Resolution ────────────────────────────────────────────────────

/**
 * Resolve employee UUID from display name.
 * Priority: FB identity name → nickName → firstName/lastName
 * Uses a request-scoped Map for cache — pass same map across calls in one request.
 *
 * @param {string} name
 * @param {Map<string, string|null>} cache  request-scoped cache
 * @returns {Promise<string|null>} employee.id or null
 */
export async function resolveEmployeeByName(name, cache = new Map()) {
  if (cache.has(name)) return cache.get(name);

  try {
    const prisma = await getPrisma();

    // 1. Match via identities JSONB → facebook.name (ADR-021)
    const byFb = await prisma.$queryRaw`
      SELECT id FROM employees
      WHERE status = 'ACTIVE'
        AND identities->'facebook'->>'name' ILIKE ${name}
      LIMIT 1
    `;
    if (byFb.length > 0) {
      cache.set(name, byFb[0].id);
      return byFb[0].id;
    }

    // 2. Fallback: nickName / firstName / lastName (exact)
    const emp = await prisma.employee.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { nickName:  { equals: name, mode: 'insensitive' } },
          { firstName: { equals: name, mode: 'insensitive' } },
          { lastName:  { equals: name, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (emp) {
      cache.set(name, emp.id);
      return emp.id;
    }

    // 3. Fuzzy fallback (ADR-043) — threshold ≥0.8 for attribution accuracy
    const allActive = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, nickName: true, identities: true },
    });

    let bestId = null;
    let bestScore = 0;
    for (const e of allActive) {
      const fbName = e.identities?.facebook?.name || undefined;
      const score = bestMatchScore(name, {
        firstName: e.firstName,
        lastName: e.lastName,
        nickName: e.nickName,
        facebookName: fbName,
      });
      if (score > bestScore) {
        bestScore = score;
        bestId = e.id;
      }
    }

    const resolvedId = bestScore >= 0.8 ? bestId : null;
    cache.set(name, resolvedId);
    return resolvedId;
  } catch (error) {
    console.error('[agentSyncRepo] resolveEmployeeByName failed', error);
    cache.set(name, null);
    return null;
  }
}

// ── Message Attribution ────────────────────────────────────────────────────

/**
 * Attribute a message by exact FB message ID.
 * @returns {Promise<number>} count of updated messages
 */
export async function attributeByMsgId(convInternalId, msgId, employeeId, fallbackName) {
  if (!employeeId) return 0; // wait for fix_responder_ids.mjs bulk pass

  try {
    const prisma = await getPrisma();
    const result = await prisma.message.updateMany({
      where: { conversationId: convInternalId, messageId: msgId, responderId: null },
      data: { responderId: employeeId },
    });
    return result.count;
  } catch (error) {
    console.error('[agentSyncRepo] attributeByMsgId failed', error);
    return 0;
  }
}

/**
 * Attribute a message by content prefix (fuzzy match — first 80 chars).
 * Only sets responderId when employeeId is non-null; never overwrites fromName
 * (the backfill already populated it correctly from the FB sender name).
 * @returns {Promise<number>} count of updated messages
 */
export async function attributeByText(convInternalId, msgText, employeeId, fallbackName) {
  // If we have no employee UUID yet, skip message-level update entirely.
  // The conversation-level fallback in processAgentAttribution will still
  // record the name in assignedAgent, and fix_responder_ids.mjs handles
  // bulk back-fill once employees are registered.
  if (!employeeId) return 0;

  try {
    const prisma = await getPrisma();
    const snippet = msgText.slice(0, 80);
    const result = await prisma.message.updateMany({
      where: {
        conversationId: convInternalId,
        content: { startsWith: snippet },
        responderId: null, // only touch unattributed messages
      },
      data: { responderId: employeeId },
    });
    return result.count;
  } catch (error) {
    console.error('[agentSyncRepo] attributeByText failed', error);
    return 0;
  }
}

// ── Conversation-Level Fallback ────────────────────────────────────────────

/**
 * Set conversation-level assigned agent when no message-level match is found.
 */
export async function setConversationAgent(convInternalId, agentNames, employeeId) {
  try {
    const prisma = await getPrisma();
    await prisma.conversation.update({
      where: { id: convInternalId },
      data: {
        assignedAgent: agentNames.join(', '),
        ...(employeeId ? { assignedEmployeeId: employeeId } : {}),
      },
    });
  } catch (error) {
    console.error('[agentSyncRepo] setConversationAgent failed', error);
  }
}

// ── Conversation ID Learning (v5) ──────────────────────────────────────────

/**
 * sync_agents_v5 can discover a "real" UID (15-digit) from a redirect when
 * navigating via a PSID (17-digit).  Update conversationId if it changed.
 *
 * @param {string} oldConversationId  - t_PSID format or t_UID
 * @param {string} newConversationId  - learned UID (t_xxx format)
 * @param {string|null} participantId - raw PSID from Business Suite URL
 */
export async function learnConversationId(oldConversationId, newConversationId, participantId) {
  if (!newConversationId || newConversationId === oldConversationId) return;

  try {
    const prisma = await getPrisma();

    // Check target doesn't already exist (avoid duplicate key)
    const existing = await prisma.conversation.findUnique({
      where: { conversationId: newConversationId },
      select: { id: true },
    });
    if (existing) return; // already correct, nothing to do

    await prisma.conversation.updateMany({
      where: { conversationId: oldConversationId },
      data: {
        conversationId: newConversationId,
        ...(participantId ? { participantId } : {}),
      },
    });

    console.log(`[agentSyncRepo] conversationId learned: ${oldConversationId} → ${newConversationId}`);
  } catch (error) {
    // P2002 = unique constraint — race condition, safe to ignore
    if (error.code !== 'P2002') {
      console.error('[agentSyncRepo] learnConversationId failed', error);
    }
  }
}

// ── Main Attribution Handler ───────────────────────────────────────────────

/**
 * Full attribution pipeline — called from POST /api/marketing/chat/message-sender
 *
 * @param {object} params
 * @param {string}   params.conversationId      - FB thread ID (t_xxx)
 * @param {string[]} params.senders             - [{ name, msgId?, msgText? }]
 * @param {string}   [params.participantId]     - PSID from Business Suite URL (v5)
 * @param {string}   [params.newConversationId] - Learned UID after redirect (v5)
 *
 * @returns {Promise<{ success: boolean, updated: number, convLevelAgent: string|null }>}
 */
export async function processAgentAttribution({ conversationId, senders, participantId, newConversationId }) {
  try {
    const prisma = await getPrisma();

    // 1. Apply learned UID before any lookup (v5 feature)
    if (newConversationId && newConversationId !== conversationId) {
      await learnConversationId(conversationId, newConversationId, participantId);
      // Use the authoritative ID going forward
      conversationId = newConversationId;
    }

    // 2. Find conversation internal UUID
    const conversation = await prisma.conversation.findUnique({
      where: { conversationId },
      select: { id: true },
    });
    if (!conversation) {
      return { success: false, updated: 0, convLevelAgent: null, note: 'conversation not found' };
    }

    const empCache = new Map();
    let updated = 0;
    // All unique senders get tracked at conversation level regardless of
    // whether message-level attribution succeeded.
    const convSenderMap = new Map(); // name → employeeId|null

    // 3. Process each sender
    for (const sender of senders) {
      const { name, msgId, msgText } = sender;
      if (!name) continue;

      const employeeId = await resolveEmployeeByName(name, empCache);

      // Track for conv-level regardless of message-level outcome
      if (!convSenderMap.has(name)) {
        convSenderMap.set(name, employeeId);
      } else if (!convSenderMap.get(name) && employeeId) {
        convSenderMap.set(name, employeeId); // upgrade null → resolved
      }

      if (msgId) {
        updated += await attributeByMsgId(conversation.id, msgId, employeeId, name);
      } else if (msgText) {
        updated += await attributeByText(conversation.id, msgText, employeeId, name);
      }
    }

    // 4. Always update conversation-level assignedAgent when we have senders
    let convLevelAgent = null;
    if (convSenderMap.size > 0) {
      const names = [...convSenderMap.keys()];
      const primaryEmpId = [...convSenderMap.values()].find(Boolean) ?? null;
      await setConversationAgent(conversation.id, names, primaryEmpId);
      convLevelAgent = names.join(', ');
    }

    return { success: true, updated, convLevelAgent };
  } catch (error) {
    console.error('[agentSyncRepo] processAgentAttribution failed', error);
    return { success: false, updated: 0, convLevelAgent: null, error: error.message };
  }
}
