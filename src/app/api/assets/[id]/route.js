import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getAssetById, updateAsset } from '@/lib/repositories/assetRepo';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const data = await getAssetById(params.id);
        if (!data) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Assets]', 'GET by ID failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = await updateAsset(params.id, body);
        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Assets]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
