import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

function getRangeFilter(range) {
    const now = new Date();
    if (range === 'today') return { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) };
    if (range === 'last_7d') return { gte: new Date(Date.now() - 7 * 86400000) };
    if (range === 'last_30d') return { gte: new Date(Date.now() - 30 * 86400000) };
    if (range === 'this_month') return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    if (range === 'last_month') {
        return {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lte: new Date(now.getFullYear(), now.getMonth(), 0),
        };
    }
    return undefined;
}

/**
 * GET /api/marketing/ads
 * Returns { success, data }
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || undefined;
        const status = searchParams.get('status') || undefined;
        const rangeFilter = getRangeFilter(range);

        const ads = await prisma.ad.findMany({
            where: {
                AND: [
                    status ? { status } : {},
                    rangeFilter ? { createdAt: rangeFilter } : {},
                ],
            },
            include: {
                adSet: { select: { name: true, campaignId: true } },
            },
            orderBy: { spend: 'desc' },
        });

        return NextResponse.json({ success: true, data: ads });
    } catch (error) {
        logger.error('AdsAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
