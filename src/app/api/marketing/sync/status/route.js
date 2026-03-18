import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const SYNC_STATUS_KEY = 'meta:last_sync';

export async function GET() {
    try {
        const redis = await getRedis();
        const raw = await redis.get(SYNC_STATUS_KEY);

        if (!raw) {
            return NextResponse.json({ success: true, lastSync: null });
        }

        const lastSync = JSON.parse(raw);
        return NextResponse.json({ success: true, lastSync });
    } catch (error) {
        console.error('[sync/status] Redis read error:', error);
        return NextResponse.json({ success: true, lastSync: null });
    }
}
