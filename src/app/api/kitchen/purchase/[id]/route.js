import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getPrisma } from '@/lib/db';

const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED'];

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { status, approvedById } = body;

        if (status && !VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
        }

        const prisma = await getPrisma();
        const result = await prisma.purchaseRequest.update({
            where: { id: params.id },
            data: {
                ...(status && { status }),
                ...(approvedById && { approvedById })
            },
            include: { items: { include: { ingredient: true } } }
        });

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[PurchaseRequest]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
