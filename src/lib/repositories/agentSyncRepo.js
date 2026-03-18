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

    // 2. Fallback: nickName / firstName / lastName
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

    cache.set(name, emp?.id ?? null);
    return emp?.id ?? null;
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
  try {
    const prisma = await getPrisma();
    const result = await prisma.message.updateMany({
      where: { conversationId: convInternalId, messageId: msgId },
      data: {
        responderId: employeeId,
        ...(employeeId ? {} : { fromName: fallbackName }),
      },
    });
    return result.count;
  } catch (error) {
    console.error('[agentSyncRepo] attributeByMsgId failed', error);
    return 0;
  }
}

/**
 * Attribute a message by content prefix (fuzzy match — first 80 chars).
 * @returns {Promise<number>} count of updated messages
 */
export async function attributeByText(convInternalId, msgText, employeeId, fallbackName) {
  try {
    const prisma = await getPrisma();
    const snippet = msgText.slice(0, 80);
    const result = await prisma.message.updateMany({
      where: {
        conversationId: convInternalId,
        content: { startsWith: snippet },
      },
      data: {
        responderId: employeeId,
        ...(employeeId ? {} : { fromName: fallbackName }),
      },
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
    const convLevelNames = [];

    // 3. Process each sender
    for (const sender of senders) {
      const { name, msgId, msgText } = sender;
      if (!name) continue;

      const employeeId = await resolveEmployeeByName(name, empCache);

      if (msgId) {
        updated += await attributeByMsgId(conversation.id, msgId, employeeId, name);
      } else if (msgText) {
        updated += await attributeByText(conversation.id, msgText, employeeId, name);
      } else {
        convLevelNames.push({ name, employeeId });
      }
    }

    // 4. Conv-level fallback
    let convLevelAgent = null;
    if (convLevelNames.length > 0) {
      const names = convLevelNames.map(s => s.name);
      const primaryEmpId = convLevelNames.find(s => s.employeeId)?.employeeId ?? null;
      await setConversationAgent(conversation.id, names, primaryEmpId);
      convLevelAgent = names.join(', ');
    }

    return { success: true, updated, convLevelAgent };
  } catch (error) {
    console.error('[agentSyncRepo] processAgentAttribution failed', error);
    return { success: false, updated: 0, convLevelAgent: null, error: error.message };
  }
}
