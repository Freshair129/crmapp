import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { scrapeMakroPrice, scrapeLotusPrice } from '@/lib/scrapers/marketScraper';

export const maxDuration = 120; // 2 minutes max execution on Vercel
export const dynamic = 'force-dynamic';

/**
 * Worker invoked via Upstash QStash (Daily Cron Job).
 * Selects Ingredients with a valid `marketUrl` and scrapes the latest prices.
 */
export async function POST(request) {
    try {
        // Authenticate QStash / Cron Secret
        const authHeader = request.headers.get('authorization') || request.headers.get('x-cron-secret');
        const qstashAuth = `Bearer ${process.env.QSTASH_TOKEN}`;
        
        if (
            authHeader !== qstashAuth && 
            authHeader !== process.env.CRON_SECRET && 
            process.env.NODE_ENV === 'production'
        ) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const prisma = await getPrisma();
        
        // 1. Fetch Ingredients configured for scraping
        const ingredients = await prisma.ingredient.findMany({
            where: {
                marketUrl: { not: null }
            },
            select: { id: true, name: true, marketUrl: true, unit: true }
        });

        if (ingredients.length === 0) {
            return NextResponse.json({ message: 'No configured ingredients to scrape.' });
        }

        let successCount = 0;
        let failCount = 0;

        // 2. Process each URL
        for (const ing of ingredients) {
            const url = ing.marketUrl.toLowerCase();
            let result = null;
            let source = 'Unknown';

            if (url.includes('makro.pro')) {
                source = 'Makro';
                result = await scrapeMakroPrice(ing.marketUrl);
            } else if (url.includes('lotus')) {
                source = 'Lotus';
                result = await scrapeLotusPrice(ing.marketUrl);
            } else {
                logger.warn('MarketScraperWorker', 'Unsupported URL source', { id: ing.id, url: ing.marketUrl });
                failCount++;
                continue;
            }

            // 3. Save History to MarketPrice Table
            if (result && result.price) {
                await prisma.marketPrice.create({
                    data: {
                        ingredientId: ing.id,
                        source,
                        price: result.price,
                        unit: result.unit || ing.unit,
                        productUrl: ing.marketUrl
                    }
                });
                successCount++;
                logger.info('MarketScraperWorker', `Scraped ${ing.name} from ${source}: ${result.price}`);
            } else {
                failCount++;
                logger.warn('MarketScraperWorker', `Failed to scrape price for ${ing.name}`, { url: ing.marketUrl });
            }
            
            // Artificial delay to prevent aggressive bot behavior triggering firewalls
            await new Promise(r => setTimeout(r, 1500));
        }

        return NextResponse.json({
            status: 'Success',
            metrics: { attempted: ingredients.length, success: successCount, failed: failCount }
        });

    } catch (err) {
        logger.error('MarketScraperWorker', 'Daily scrape failed', err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// Support GET for testing/manual triggers directly from the browser/Vercel CLI
export async function GET(request) {
    if (process.env.NODE_ENV === 'development') {
        const req = request.clone();
        return await POST(req);
    }
    return new NextResponse('Method Not Allowed', { status: 405 });
}
