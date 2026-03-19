import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

/**
 * GET /api/marketing/campaigns/[id]
 */
export async function GET(request, { params }) {
    try {
        const campaign = await marketingRepo.getCampaignWithMetrics(params.id);

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
        const body = await request.json();

        // Whitelist fields to update
        const data = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.status !== undefined) data.status = body.status;
        if (body.isVisible !== undefined) data.isVisible = body.isVisible;
        if (body.mappedProductId !== undefined) data.mappedProductId = body.mappedProductId;

        const campaign = await marketingRepo.updateCampaign(params.id, data);

        return NextResponse.json({ success: true, data: campaign });
    } catch (error) {
        logger.error('CampaignAPI', 'PATCH [id] error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
