import { cache } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

const CONFIG_KEY = 'sheets:sync_config';

/**
 * GET /api/marketing/sheets/config
 * Returns current sync configuration.
 */
export async function GET() {
    try {
        const config = await cache.get(CONFIG_KEY) || {
            mode: 'manual',
            interval: 15,
            lastSyncAt: null
        };
        return NextResponse.json(config);
    } catch (error) {
        logger.error('[SyncConfig]', 'Failed to get config', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/marketing/sheets/config
 * Updates sync configuration.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { mode, interval } = body;

        const currentConfig = await cache.get(CONFIG_KEY) || {
            mode: 'manual',
            interval: 15,
            lastSyncAt: null
        };

        const newConfig = {
            ...currentConfig,
            mode: mode || currentConfig.mode,
            interval: interval !== undefined ? parseInt(interval) : currentConfig.interval
        };

        await cache.set(CONFIG_KEY, newConfig, 0); // Permanent
        logger.info('[SyncConfig]', `Config updated: mode=${newConfig.mode}, interval=${newConfig.interval}`);
        
        return NextResponse.json(newConfig);
    } catch (error) {
        logger.error('[SyncConfig]', 'Failed to update config', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
