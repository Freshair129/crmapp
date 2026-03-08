import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/customers/[id] - Get customer detail
 */
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                orders: { orderBy: { date: 'desc' }, take: 10 },
                inventory: true,
                timeline: { orderBy: { date: 'desc' }, take: 20 },
                conversations: { orderBy: { lastMessageAt: 'desc' }, take: 5 }
            }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json(customer);
    } catch (error) {
        logger.error('CustomerDetailAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/customers/[id] - Update customer
 */
export async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const prisma = await getPrisma();

        const updated = await prisma.customer.update({
            where: { id },
            data: body
        });

        return NextResponse.json(updated);
    } catch (error) {
        logger.error('CustomerDetailAPI', 'PATCH error', error);
        return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }
}

/**
 * DELETE /api/customers/[id] - Delete customer
 */
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();

        await prisma.customer.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('CustomerDetailAPI', 'DELETE error', error);
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }
}
