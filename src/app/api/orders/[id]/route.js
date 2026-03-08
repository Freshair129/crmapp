import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/orders/[id] - Get order detail
 */
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                transactions: true,
                conversation: true
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        logger.error('OrderDetailAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
