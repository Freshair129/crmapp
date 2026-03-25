import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/lib/idGenerators';
import { rankByNameMatch } from '@/lib/thaiNameMatcher';

/**
 * GET /api/customers - List customers
 * Query params:
 *   search  — name/phone substring
 *   stage   — lifecycle stage filter
 *   tier    — membership tier filter
 *   fuzzy   — "true" to enable fuzzy Thai name matching (ADR-043)
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);

        const search = searchParams.get('search') || '';
        const stage = searchParams.get('stage') || undefined;
        const tier = searchParams.get('tier') || undefined;
        const fuzzy = searchParams.get('fuzzy') === 'true';

        // Base filters (stage, tier) — applied in both exact and fuzzy modes
        const baseWhere = {
            AND: [
                stage ? { lifecycleStage: stage } : {},
                tier ? { membershipTier: tier } : {}
            ]
        };

        // Standard exact/contains search
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
                    ...baseWhere.AND
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Aggregate order revenue per customer (for Analytics — avoids N+1)
        const customerIds = customers.map(c => c.id);
        const [orderTotals, ordersWithItems] = await Promise.all([
            prisma.order.groupBy({
                by: ['customerId'],
                where: { customerId: { in: customerIds }, status: { in: ['PAID', 'Completed', 'COMPLETED'] } },
                _sum: { paidAmount: true, totalAmount: true },
                _count: { id: true },
            }),
            prisma.order.findMany({
                where: { customerId: { in: customerIds } },
                select: { customerId: true, paidAmount: true, totalAmount: true, items: true, status: true, date: true, orderId: true },
                orderBy: { date: 'desc' },
            }),
        ]);

        const revenueMap = new Map(orderTotals.map(r => [
            r.customerId,
            { revenue: r._sum.paidAmount || r._sum.totalAmount || 0, count: r._count.id }
        ]));
        const ordersByCustomer = {};
        ordersWithItems.forEach(o => {
            if (!ordersByCustomer[o.customerId]) ordersByCustomer[o.customerId] = [];
            ordersByCustomer[o.customerId].push(o);
        });

        const enrich = (list) => list.map(c => ({
            ...c,
            _orderRevenue: revenueMap.get(c.id)?.revenue || 0,
            _orderCount:   revenueMap.get(c.id)?.count   || 0,
            orders: ordersByCustomer[c.id] || [],
        }));

        // Fuzzy fallback: when exact returns few results, broaden and re-rank (ADR-043)
        if (fuzzy && search && customers.length < 3) {
            const broadResults = await prisma.customer.findMany({
                where: baseWhere,
                orderBy: { createdAt: 'desc' },
                take: 100
            });

            const ranked = rankByNameMatch(search, broadResults.map(c => ({
                ...c,
                facebookName: c.facebookName || undefined,
            })), 0.6);

            // Merge: exact first, then fuzzy extras (deduplicated)
            const seenIds = new Set(customers.map(c => c.id));
            const fuzzyExtras = ranked
                .filter(r => !seenIds.has(r.record.id))
                .map(r => r.record);

            return NextResponse.json(enrich([...customers, ...fuzzyExtras].slice(0, 50)));
        }

        return NextResponse.json(enrich(customers));
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
