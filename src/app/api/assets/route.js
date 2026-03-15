import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getAllAssets, createAsset } from '@/lib/repositories/assetRepo';

export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const data = await getAllAssets({
            category: searchParams.get('category'),
            status: searchParams.get('status'),
            search: searchParams.get('search')
        });
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Assets]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = await createAsset(body);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error('[Assets]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
