import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/utils/idGenerator';

/**
 * GET /api/customers - List customers
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);

        const search = searchParams.get('search') || '';
        const stage = searchParams.get('stage') || undefined;
        const tier = searchParams.get('tier') || undefined;

        const customers = await prisma.customer.findMany({
            where: {
                AND: [
                    search ? {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { nickName: { contains: search, mode: 'insensitive' } },
                            { customerId: { contains: search, mode: 'insensitive' } },
                            { phonePrimary: { contains: search } }
                        ]
                    } : {},
                    stage ? { lifecycleStage: stage } : {},
                    tier ? { membershipTier: tier } : {}
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit for now
        });

        return NextResponse.json(customers);
    } catch (error) {
        logger.error('CustomerAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/customers - Create customer
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const prisma = await getPrisma();

        // Identity operations must be in a transaction as per GEMINI.md
        const customer = await prisma.$transaction(async (tx) => {
            const customerId = await generateCustomerId(body.channel || 'WB');

            return tx.customer.create({
                data: {
                    customerId,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    nickName: body.nickName,
                    email: body.email,
                    phonePrimary: body.phonePrimary,
                    lineId: body.lineId,
                    facebookId: body.facebookId,
                    membershipTier: body.membershipTier || 'MEMBER',
                    lifecycleStage: body.lifecycleStage || 'Lead',
                    intelligence: body.intelligence || {},
                }
            });
        });

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        logger.error('CustomerAPI', 'POST error', error);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }
}
