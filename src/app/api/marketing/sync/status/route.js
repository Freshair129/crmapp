import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

export async function GET() {
    try {
        const lastSync = await marketingRepo.getSyncStatus();

        if (!lastSync) {
            return NextResponse.json({ success: true, lastSync: null });
        }

        return NextResponse.json({ success: true, lastSync });
    } catch (error) {
        logger.error('[sync/status]', 'Redis read error', error);
        return NextResponse.json({ success: true, lastSync: null });
    }
}
