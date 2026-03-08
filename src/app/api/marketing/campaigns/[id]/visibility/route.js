import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * PATCH /api/marketing/campaigns/[id]/visibility
 * Body: { isVisible: boolean }
 */
export async function PATCH(request, { params }) {
    try {
        const prisma = await getPrisma();
        const { isVisible } = await request.json();

        await prisma.campaign.update({
            where: { id: params.id },
            data: { isVisible: Boolean(isVisible) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('CampaignAPI', 'PATCH visibility error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
