import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Priority levels — L0 (Critical) → L5 (Optional)
 * L0: Critical/Emergency  — หยุดงานอื่นทำทันที
 * L1: High/Urgent         — ต้องทำวันนี้
 * L2: High/Important      — สำคัญ วางแผนต่อจาก L1
 * L3: Medium/Routine      — งานประจำ
 * L4: Low/Deferrable      — เลื่อนออกไปได้
 * L5: Low/Optional        — ทำเมื่อมีเวลาว่าง
 */
export const VALID_PRIORITIES = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
export const VALID_STATUSES   = ['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
export const VALID_TYPES      = ['FOLLOW_UP', 'MEETING', 'CALL', 'EMAIL', 'PURCHASE', 'REVIEW', 'OTHER'];

/**
 * Generate task ID: TSK-YYYYMMDD-NNN
 */
async function generateTaskId(prisma) {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TSK-${datePart}-`;
    const latest = await prisma.task.findFirst({
        where: { taskId: { startsWith: prefix } },
        orderBy: { taskId: 'desc' },
        select: { taskId: true },
    });
    const serial = latest
        ? String(parseInt(latest.taskId.split('-')[2] || '0', 10) + 1).padStart(3, '0')
        : '001';
    return `${prefix}${serial}`;
}

/**
 * GET /api/tasks
 * Query: status, priority, assigneeId, customerId, limit, offset
 */
export async function GET(req) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(req.url);

        const status     = searchParams.get('status');
        const priority   = searchParams.get('priority');
        const assigneeId = searchParams.get('assigneeId');
        const customerId = searchParams.get('customerId');
        const limit      = parseInt(searchParams.get('limit') || '100', 10);
        const offset     = parseInt(searchParams.get('offset') || '0', 10);

        const where = {};
        if (status)     where.status     = status;
        if (priority)   where.priority   = priority;
        if (assigneeId) where.assigneeId = assigneeId;
        if (customerId) where.customerId = customerId;

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                orderBy: [
                    // Sort by priority level (L0 first), then by dueDate
                    { priority: 'asc' },
                    { dueDate: 'asc' },
                    { createdAt: 'desc' },
                ],
                take: limit,
                skip: offset,
                include: {
                    assignee: {
                        select: { id: true, firstName: true, lastName: true, nickName: true, employeeId: true },
                    },
                    customer: {
                        select: { id: true, firstName: true, lastName: true, customerId: true },
                    },
                },
            }),
            prisma.task.count({ where }),
        ]);

        // Count pending L0+L1 for badge
        const urgentCount = await prisma.task.count({
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] }, priority: { in: ['L0', 'L1'] } },
        });

        return NextResponse.json({ success: true, data: tasks, total, urgentCount });
    } catch (error) {
        logger.error('TaskAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/tasks
 * Body: { title, description?, type?, priority?, assigneeId?, customerId?, dueDate? }
 */
export async function POST(req) {
    try {
        const prisma = await getPrisma();
        const body = await req.json();
        const { title, description, type, priority, assigneeId, customerId, dueDate } = body;

        if (!title) {
            return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }

        const resolvedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'L3';
        const resolvedType     = VALID_TYPES.includes(type)          ? type     : 'FOLLOW_UP';

        const taskId = await generateTaskId(prisma);

        const task = await prisma.task.create({
            data: {
                taskId,
                title,
                description: description || null,
                type:        resolvedType,
                priority:    resolvedPriority,
                status:      'PENDING',
                assigneeId:  assigneeId  || null,
                customerId:  customerId  || null,
                dueDate:     dueDate     ? new Date(dueDate) : null,
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, nickName: true } },
                customer: { select: { id: true, firstName: true, lastName: true, customerId: true } },
            },
        });

        return NextResponse.json({ success: true, data: task }, { status: 201 });
    } catch (error) {
        logger.error('TaskAPI', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
