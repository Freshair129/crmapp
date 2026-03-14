import { syncGoogleSheetTasks } from '@/lib/googleSheetService';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const prisma = await getPrisma(); // Ensure prisma is available if needed, though here we use record conversion etc.
        logger.info('[SheetSync]', 'Manual sync triggered from UI');
        const result = await syncGoogleSheetTasks();
        
        if (result.success) {
            const config = await cache.get('sheets:sync_config') || { mode: 'manual', interval: 15 };
            config.lastSyncAt = new Date().toISOString();
            await cache.set('sheets:sync_config', config, 0);
        }

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[SheetSync]', 'Manual sync failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
