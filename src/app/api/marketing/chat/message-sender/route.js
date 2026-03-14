import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * POST /api/marketing/chat/message-sender
 * Called by sync_agents_v2.js (Playwright scraper)
 *
 * Body: {
 *   conversationId: string,   // FB thread ID (t_xxx)
 *   senders: [{ name, msgId, msgText }]
 * }
 *
 * Logic:
 *  - Look up Employee by nick_name / first_name match
 *  - If msgId → update messages.responder_id where message_id = msgId
 *  - If msgText only → update messages.responder_id where content matches
 *  - If neither → update conversations.assigned_employee_id (conv-level)
 */
export async function POST(req) {
    try {
        const { conversationId, senders } = await req.json();
        const prisma = await getPrisma();

        if (!conversationId || !Array.isArray(senders) || senders.length === 0) {
            return NextResponse.json({ error: 'conversationId and senders required' }, { status: 400 });
        }

        // Find conversation
        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            select: { id: true },
        });
        if (!conversation) {
            return NextResponse.json({ success: false, updated: 0, note: 'conversation not found' });
        }

        // Cache employee lookups within this request
        // Priority: identities->facebook->name → nickName → firstName → lastName
        const employeeCache = new Map();
        async function resolveEmployee(name) {
            if (employeeCache.has(name)) return employeeCache.get(name);

            // 1. Match by facebook name stored in identities JSONB
            const byFb = await prisma.$queryRaw`
                SELECT id FROM employees
                WHERE status = 'ACTIVE'
                  AND identities->'facebook'->>'name' ILIKE ${name}
                LIMIT 1
            `;
            if (byFb.length > 0) {
                employeeCache.set(name, byFb[0].id);
                return byFb[0].id;
            }

            // 2. Fallback: nickName / firstName / lastName
            const emp = await prisma.employee.findFirst({
                where: {
                    status: 'ACTIVE',
                    OR: [
                        { nickName: { equals: name, mode: 'insensitive' } },
                        { firstName: { equals: name, mode: 'insensitive' } },
                        { lastName: { equals: name, mode: 'insensitive' } },
                    ],
                },
                select: { id: true },
            });
            employeeCache.set(name, emp?.id ?? null);
            return emp?.id ?? null;
        }

        let updated = 0;
        let convLevelNames = [];

        for (const sender of senders) {
            const { name, msgId, msgText } = sender;
            if (!name) continue;

            const employeeId = await resolveEmployee(name);

            if (msgId) {
                // Precise match by message ID
                const result = await prisma.message.updateMany({
                    where: {
                        conversationId: conversation.id,
                        messageId: msgId,
                    },
                    data: {
                        responderId: employeeId,
                        fromName: employeeId ? undefined : name,
                    },
                });
                updated += result.count;
            } else if (msgText) {
                // Fuzzy match by content prefix (first 80 chars)
                const snippet = msgText.slice(0, 80);
                const result = await prisma.message.updateMany({
                    where: {
                        conversationId: conversation.id,
                        content: { startsWith: snippet },
                    },
                    data: {
                        responderId: employeeId,
                        fromName: employeeId ? undefined : name,
                    },
                });
                updated += result.count;
            } else {
                // Conv-level fallback — track for assigned_agent update
                convLevelNames.push(name);
            }
        }

        // Conv-level: update assigned_agent name + employeeId if we have it
        if (convLevelNames.length > 0) {
            const firstName = convLevelNames[0];
            const empId = await resolveEmployee(firstName);
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    assignedAgent: convLevelNames.join(', '),
                    ...(empId ? { assignedEmployeeId: empId } : {}),
                },
            });
        }

        return NextResponse.json({ success: true, updated });
    } catch (err) {
        console.error('[message-sender] POST error', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
