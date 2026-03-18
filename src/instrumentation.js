export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Singleton Guard: Avoid multiple registrations during HMR in Dev mode
        if (global.__cron_registered) return;
        global.__cron_registered = true;

        const { default: cron } = await import('node-cron');
        const { detectCreativeFatigue } = await import('./services/fatigueDetector.js');
        const { sendLineAlert } = await import('./lib/lineService.js');
        const { logger } = await import('./lib/logger.js');
        const { sendDailySheetSummary, syncGoogleSheetTasks } = await import('./lib/googleSheetService.js');
        const { cache } = await import('./lib/redis.js');

        logger.info('[Instrumentation]', 'Initializing Crons: Fatigue(09:00), ContentSummary(08:00), SheetsSync(Dynamic)');

        // 1. Creative Fatigue (09:00)
        cron.schedule('0 9 * * *', async () => {
            try {
                logger.info('[Instrumentation]', 'Running daily Creative Fatigue detection...');
                const fatiguedAds = await detectCreativeFatigue(14, 500);
                if (fatiguedAds.length > 0) {
                    const N = fatiguedAds.length;
                    let alertMsg = `⚠️ Creative Fatigue: ${N} ads\n`;
                    fatiguedAds.forEach(ad => {
                        alertMsg += `- ${ad.adName} (${ad.ageDays}d, ฿${Number(ad.totalSpend).toLocaleString()})\n`;
                    });
                    logger.warn('[Instrumentation]', 'Fatigued ads detected', { count: N });
                    await sendLineAlert(alertMsg.trim());
                } else {
                    logger.info('[Instrumentation]', 'No creative fatigue detected today.');
                }
            } catch (e) {
                logger.error('[Instrumentation]', 'Fatigue cron error', e);
            }
        });

        // 2. Google Sheets Daily Summary (08:00)
        cron.schedule('0 8 * * *', async () => {
            try {
                logger.info('[Instrumentation]', 'Running daily Google Sheets summary...');
                await sendDailySheetSummary();
            } catch (e) {
                logger.error('[Instrumentation]', 'Sheets summary cron error', e);
            }
        });

        // 3. Google Sheets Dynamic Sync (Check every 5 mins)
        cron.schedule('*/5 * * * *', async () => {
            try {
                const config = await cache.get('sheets:sync_config') || { mode: 'manual', interval: 15, lastSyncAt: null };

                if (config.mode !== 'auto') return;

                const now = Date.now();
                const lastSync = config.lastSyncAt ? new Date(config.lastSyncAt).getTime() : 0;
                const intervalMs = config.interval * 60 * 1000;

                if (now - lastSync >= intervalMs) {
                    logger.info('[Instrumentation]', `Dynamic sync triggered (interval: ${config.interval}m)`);
                    await syncGoogleSheetTasks();
                    
                    // Update last sync time
                    config.lastSyncAt = new Date().toISOString();
                    await cache.set('sheets:sync_config', config, 86400) // 24h — persists sync config across restarts;
                }
            } catch (e) {
                logger.error('[Instrumentation]', 'Dynamic sync error', e);
            }
        });
    }
}
