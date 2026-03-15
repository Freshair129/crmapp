import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getPackageById, updatePackage } from '@/lib/repositories/packageRepo';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const pkg = await getPackageById(params.id);
        if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

        return NextResponse.json(pkg);
    } catch (error) {
        logger.error('[Packages]', 'GET by ID failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const updated = await updatePackage(params.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        logger.error('[Packages]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
