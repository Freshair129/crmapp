import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

/**
 * PATCH /api/marketing/campaigns/[id]/visibility
 * Body: { isVisible: boolean }
 */
export async function PATCH(request, { params }) {
    try {
        const { isVisible } = await request.json();

        await marketingRepo.updateCampaign(params.id, { isVisible: Boolean(isVisible) });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('CampaignAPI', 'PATCH visibility error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
