/**
 * POST /api/marketing/sync-hourly-now
 * Manual trigger for hourly FB sync — session-authenticated (no QStash needed).
 * Internally forwards to sync-hourly with CRON_SECRET.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
    }

    try {
        const origin = request.nextUrl.origin;
        const headers = {
            'authorization': `Bearer ${process.env.CRON_SECRET}`,
        };
        // Include Vercel Deployment Protection bypass (same as QStash config)
        const bypassSecret = process.env.VERCEL_BYPASS_SECRET;
        if (bypassSecret) headers['x-vercel-protection-bypass'] = bypassSecret;

        const res = await fetch(`${origin}/api/marketing/sync-hourly`, {
            method: 'GET',
            headers,
        });

        const data = await res.json();
        logger.info('[SyncHourlyNow]', `Manual trigger by ${session.user?.email || 'unknown'}`, data);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        logger.error('[SyncHourlyNow]', 'Manual sync failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
