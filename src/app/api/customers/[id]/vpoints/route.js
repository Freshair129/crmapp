import { NextResponse } from 'next/server';
import { awardVPoints } from '@/lib/repositories/customerRepo';
import { getPrisma } from '@/lib/db';

/**
 * POST /api/customers/[id]/vpoints
 * Body: { orderAmount: number }
 * Awards V Points after a completed order
 */
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const { orderAmount } = await req.json();

        if (!orderAmount || orderAmount <= 0) {
            return NextResponse.json({ error: 'orderAmount required' }, { status: 400 });
        }

        // Get total learning hours from enrollments
        const prisma = await getPrisma();
        const agg = await prisma.enrollment.aggregate({
            where: { customerId: id },
            _sum: { hoursCompleted: true }
        });
        const totalHours = agg._sum.hoursCompleted || 0;

        const updated = await awardVPoints(id, orderAmount, totalHours);
        if (!updated) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

        return NextResponse.json({
            vpPoints: updated.vpPoints,
            totalVpEarned: updated.totalVpEarned,
            totalSpend: updated.totalSpend,
            membershipTier: updated.membershipTier,
            earned: Math.floor(orderAmount / 150) * 300,
        });
    } catch (err) {
        console.error('[/api/customers/vpoints]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
