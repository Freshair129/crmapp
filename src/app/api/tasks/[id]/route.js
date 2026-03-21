import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { VALID_PRIORITIES, VALID_STATUSES, VALID_TYPES } from '../route';

/**
 * PATCH /api/tasks/[id]
 * Updatable: title, description, type, priority, status, assigneeId, dueDate
 */
export async function PATCH(req, { params }) {
    try {
        const prisma = await getPrisma();
        const { id } = params;
        const body = await req.json();

        const updateData = {};
        if ('title'       in body) updateData.title       = body.title;
        if ('description' in body) updateData.description = body.description;
        if ('assigneeId'  in body) updateData.assigneeId  = body.assigneeId;
        if ('customerId'  in body) updateData.customerId  = body.customerId;
        if ('dueDate'     in body) updateData.dueDate     = body.dueDate ? new Date(body.dueDate) : null;

        if ('priority' in body) {
            updateData.priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : undefined;
        }
        if ('status' in body) {
            updateData.status = VALID_STATUSES.includes(body.status) ? body.status : undefined;
            if (body.status === 'DONE') updateData.completedAt = new Date();
            if (body.status !== 'DONE') updateData.completedAt = null;
        }
        if ('type' in body) {
            updateData.type = VALID_TYPES.includes(body.type) ? body.type : undefined;
        }

        const task = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, nickName: true } },
                customer: { select: { id: true, firstName: true, lastName: true, customerId: true } },
            },
        });

        return NextResponse.json({ success: true, data: task });
    } catch (error) {
        logger.error('TaskAPI', 'PATCH error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/tasks/[id]
 * Soft-delete: set status = CANCELLED
 */
export async function DELETE(req, { params }) {
    try {
        const prisma = await getPrisma();
        const { id } = params;
        await prisma.task.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('TaskAPI', 'DELETE error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
