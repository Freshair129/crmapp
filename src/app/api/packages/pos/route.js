import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getActivePackagesForPOS } from '@/lib/repositories/packageRepo';

export async function GET() {
    try {
        const packages = await getActivePackagesForPOS();
        return NextResponse.json(packages);
    } catch (error) {
        logger.error('[PackagesPOS]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
