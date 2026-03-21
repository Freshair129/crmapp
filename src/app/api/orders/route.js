import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import crypto from 'crypto';

/**
 * GET /api/orders - List orders
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get('status') || undefined;
        const customerId = searchParams.get('customerId') || undefined;

        const orders = await prisma.order.findMany({
            where: {
                AND: [
                    status ? { status } : {},
                    customerId ? { customerId } : {}
                ]
            },
            include: {
                customer: {
                    select: { firstName: true, lastName: true, customerId: true }
                }
            },
            orderBy: { date: 'desc' },
            take: 50
        });

        return NextResponse.json(orders);
    } catch (error) {
        logger.error('OrderAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/orders - Create order
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const prisma = await getPrisma();

        const order = await prisma.$transaction(async (tx) => {
            return tx.order.create({
                data: {
                    orderId: crypto.randomUUID(),
                    customerId: body.customerId,
                    date: body.date ? new Date(body.date) : new Date(),
                    status: body.status || 'PENDING',
                    totalAmount: body.totalAmount,
                    paidAmount: body.paidAmount || (body.isDeposit ? Number(body.depositAmount || 0) : body.totalAmount) || 0,
                    discountAmount: Number(body.discountAmount || 0),
                    discountPercent: body.discountPercent ? Number(body.discountPercent) : null,
                    promoCode: body.promoCode || null,
                    paymentMethod: body.paymentMethod || null,
                    bankName: body.bankName || null,
                    isDeposit: body.isDeposit || false,
                    items: body.items || [],
                    closedById: body.closedById || null,
                    salesStaffId: body.salesStaffId || null,
                    cashierId: body.cashierId || null,
                    conversationId: body.conversationId || null,
                    notes: body.notes || null,
                }
            });
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        logger.error('OrderAPI', 'POST error', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
