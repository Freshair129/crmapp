// ─── notionRepo.js — Notion ↔ CRM Task Bidirectional Sync ────────────────────
// Notion database ID: stored in NOTION_TASK_DB_ID env var
// Notion token:       stored in NOTION_TOKEN env var (Integration token)
// ─────────────────────────────────────────────────────────────────────────────

import { getPrisma } from '@/lib/db';
import { generateTaskId } from '@/lib/idGenerators';

const NOTION_API  = 'https://api.notion.com/v1';
const NOTION_VER  = '2022-06-28';

function headers() {
    return {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': NOTION_VER,
        'Content-Type': 'application/json',
    };
}

// ─── Priority mapping CRM ↔ Notion ───────────────────────────────────────────
const PRIORITY_TO_NOTION = {
    L0: 'L0 · Critical',
    L1: 'L1 · Urgent',
    L2: 'L2 · Important',
    L3: 'L3 · Routine',
    L4: 'L4 · Deferrable',
    // CRM old format fallback
    CRITICAL: 'L0 · Critical',
    HIGH:     'L1 · Urgent',
    MEDIUM:   'L2 · Important',
    LOW:      'L4 · Deferrable',
};

const PRIORITY_FROM_NOTION = {
    'L0 · Critical':    'L0',
    'L1 · Urgent':      'L1',
    'L2 · Important':   'L2',
    'L3 · Routine':     'L3',
    'L4 · Deferrable':  'L4',
};

// ─── Status mapping CRM ↔ Notion ─────────────────────────────────────────────
const STATUS_TO_NOTION = {
    PENDING:     '🟠 Urgent',
    IN_PROGRESS: '🟡 In Progress',
    DONE:        '✅ Done',
    CANCELLED:   '⏸ On Hold',
};

const STATUS_FROM_NOTION = {
    '🔴 Critical':   'PENDING',
    '🟠 Urgent':     'PENDING',
    '🟡 In Progress': 'IN_PROGRESS',
    '✅ Done':        'DONE',
    '⏸ On Hold':    'PENDING',
};

// ─── Push one CRM task → Notion ──────────────────────────────────────────────
export async function pushTaskToNotion(task) {
    const dbId = process.env.NOTION_TASK_DB_ID;
    if (!dbId || !process.env.NOTION_TOKEN) {
        throw new Error('[notionRepo] NOTION_TOKEN or NOTION_TASK_DB_ID not set');
    }

    const assigneeName = task.assignee
        ? (task.assignee.nickName || task.assignee.firstName || '')
        : '';

    const properties = {
        'Task':       { title: [{ text: { content: task.title || 'Untitled' } }] },
        'Status':     { select: { name: STATUS_TO_NOTION[task.status] || '🟡 In Progress' } },
        'Priority':   { select: { name: PRIORITY_TO_NOTION[task.priority] || 'L3 · Routine' } },
        'CRM Task ID':{ rich_text: [{ text: { content: task.taskId || task.id || '' } }] },
        'Notes':      { rich_text: [{ text: { content: task.description || '' } }] },
        'Assignee':   { rich_text: [{ text: { content: assigneeName } }] },
    };

    if (task.dueDate) {
        properties['Due Date'] = {
            date: { start: new Date(task.dueDate).toISOString().slice(0, 10) },
        };
    }

    // Update if already in Notion, otherwise create
    if (task.notionId) {
        const res = await fetch(`${NOTION_API}/pages/${task.notionId}`, {
            method: 'PATCH',
            headers: headers(),
            body: JSON.stringify({ properties }),
        });
        if (!res.ok) throw new Error(`[notionRepo] PATCH failed: ${res.status}`);
        return { action: 'updated', notionId: task.notionId };
    }

    const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ parent: { database_id: dbId }, properties }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[notionRepo] POST failed: ${res.status} ${err}`);
    }
    const data = await res.json();
    return { action: 'created', notionId: data.id };
}

// ─── Push ALL active CRM tasks → Notion ──────────────────────────────────────
export async function pushAllTasksToNotion() {
    const prisma = await getPrisma();
    const tasks = await prisma.task.findMany({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        include: { assignee: { select: { nickName: true, firstName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    let created = 0, updated = 0, failed = 0;
    for (const task of tasks) {
        try {
            const result = await pushTaskToNotion(task);
            // Save notionId back to CRM if newly created
            if (result.action === 'created') {
                await prisma.task.update({
                    where: { id: task.id },
                    data: { notionId: result.notionId },
                });
                created++;
            } else {
                updated++;
            }
        } catch (e) {
            console.error('[notionRepo] push failed for task', task.taskId, e.message);
            failed++;
        }
    }
    return { created, updated, failed, total: tasks.length };
}

// ─── Pull tasks from Notion → CRM (upsert) ───────────────────────────────────
export async function pullTasksFromNotion() {
    const dbId = process.env.NOTION_TASK_DB_ID;
    if (!dbId || !process.env.NOTION_TOKEN) {
        throw new Error('[notionRepo] NOTION_TOKEN or NOTION_TASK_DB_ID not set');
    }

    // Fetch all non-done tasks from Notion
    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
            filter: {
                property: 'Status',
                select: { does_not_equal: '✅ Done' },
            },
            sorts: [{ property: 'Due Date', direction: 'ascending' }],
            page_size: 100,
        }),
    });
    if (!res.ok) throw new Error(`[notionRepo] query failed: ${res.status}`);
    const data = await res.json();

    const prisma = await getPrisma();
    let imported = 0, skipped = 0;

    for (const page of data.results || []) {
        try {
            const crmTaskId = page.properties['CRM Task ID']?.rich_text?.[0]?.text?.content || '';
            const title     = page.properties['Task']?.title?.[0]?.text?.content || 'Untitled';
            const status    = STATUS_FROM_NOTION[page.properties['Status']?.select?.name] || 'PENDING';
            const priority  = PRIORITY_FROM_NOTION[page.properties['Priority']?.select?.name] || 'L3';
            const notes     = page.properties['Notes']?.rich_text?.[0]?.text?.content || '';
            const dueDateRaw = page.properties['Due Date']?.date?.start || null;
            const dueDate   = dueDateRaw ? new Date(dueDateRaw) : null;
            const notionId  = page.id;

            if (crmTaskId) {
                // Task already linked to CRM — update status only
                await prisma.task.updateMany({
                    where: { OR: [{ taskId: crmTaskId }, { notionId }] },
                    data: { status, notionId },
                });
                skipped++;
            } else {
                // New task created in Notion — import to CRM
                const newTaskId = await generateTaskId();
                await prisma.task.create({
                    data: {
                        taskId: newTaskId,
                        title,
                        description: notes,
                        priority,
                        status,
                        dueDate,
                        notionId,
                        type: 'FOLLOW_UP',
                    },
                });
                // Write back CRM Task ID to Notion so future syncs link correctly
                await fetch(`${NOTION_API}/pages/${notionId}`, {
                    method: 'PATCH',
                    headers: headers(),
                    body: JSON.stringify({
                        properties: {
                            'CRM Task ID': { rich_text: [{ text: { content: newTaskId } }] },
                        },
                    }),
                });
                imported++;
            }
        } catch (e) {
            console.error('[notionRepo] pull error for page', page.id, e.message);
        }
    }

    return { imported, updated: skipped, total: (data.results || []).length };
}

// ─── Get Notion sync status ───────────────────────────────────────────────────
export async function getNotionSyncStatus() {
    const prisma = await getPrisma();
    const [total, synced] = await Promise.all([
        prisma.task.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
        prisma.task.count({ where: { notionId: { not: null } } }),
    ]);
    return {
        totalActive: total,
        syncedToNotion: synced,
        notionDbId: process.env.NOTION_TASK_DB_ID || null,
        configured: !!(process.env.NOTION_TOKEN && process.env.NOTION_TASK_DB_ID),
    };
}
