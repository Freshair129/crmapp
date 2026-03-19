import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getPrisma } from '@/lib/db';
import { getEnrollmentsByCustomer, createEnrollment } from '@/lib/repositories/enrollmentRepo';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const status = searchParams.get('status');

        if (customerId) {
            const data = await getEnrollmentsByCustomer(customerId);
            return NextResponse.json(data);
        }

        const prisma = await getPrisma();
        const data = await prisma.enrollment.findMany({
            where: status ? { status } : {},
            include: {
                items: { include: { product: true } },
                customer: { select: { firstName: true, lastName: true, customerId: true } }
            },
            orderBy: { enrolledAt: 'desc' }
        });

        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Enrollments]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = await createEnrollment(body);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error('[Enrollments]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
