import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getAllPackages, createPackage } from '@/lib/repositories/packageRepo';

export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const isActive = searchParams.get('isActive');
        const search = searchParams.get('search');

        const data = await getAllPackages({ isActive, search });
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Packages]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, description, originalPrice, packagePrice, courses, gifts } = body;

        if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
        if (originalPrice === undefined || packagePrice === undefined) {
            return NextResponse.json({ error: 'originalPrice and packagePrice are required' }, { status: 400 });
        }

        const pkg = await createPackage({ name, description, originalPrice, packagePrice, courses, gifts });
        logger.info('[Packages]', `Created package ${pkg.packageId}`);
        return NextResponse.json(pkg, { status: 201 });
    } catch (error) {
        logger.error('[Packages]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
