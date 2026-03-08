import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/marketing/campaigns/[id]
 */
export async function GET(request, { params }) {
    try {
        const prisma = await getPrisma();
        const campaign = await prisma.campaign.findUnique({
            where: { id: params.id },
            include: { adSets: { include: { ads: true } } },
        });

        if (!campaign) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: campaign });
    } catch (error) {
        logger.error('CampaignAPI', 'GET [id] error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/marketing/campaigns/[id]
 */
export async function PATCH(request, { params }) {
    try {
        const prisma = await getPrisma();
        const body = await request.json();

        const campaign = await prisma.campaign.update({
            where: { id: params.id },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
                ...(body.mappedProductId !== undefined && { mappedProductId: body.mappedProductId }),
            },
        });

        return NextResponse.json({ success: true, data: campaign });
    } catch (error) {
        logger.error('CampaignAPI', 'PATCH [id] error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
