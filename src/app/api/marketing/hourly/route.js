import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        
        if (!dateStr) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const date = new Date(dateStr);
        const prisma = await getPrisma();

        // Fetch hourly metrics for all ads on the given date
        const hourlyMetrics = await prisma.adHourlyMetric.findMany({
            where: {
                date: {
                    equals: date
                }
            },
            orderBy: {
                hour: 'asc'
            }
        });

        // Aggregate metrics by hour
        const aggregated = Array.from({ length: 24 }, (_, i) => {
            const hourStr = i.toString().padStart(2, '0');
            const hourMetrics = hourlyMetrics.filter(m => m.hour === i);
            
            const spend = hourMetrics.reduce((sum, m) => sum + m.spend, 0);
            const impressions = hourMetrics.reduce((sum, m) => sum + m.impressions, 0);
            const clicks = hourMetrics.reduce((sum, m) => sum + m.clicks, 0);
            const leads = hourMetrics.reduce((sum, m) => sum + m.leads, 0);
            const purchases = hourMetrics.reduce((sum, m) => sum + m.purchases, 0);
            const revenue = hourMetrics.reduce((sum, m) => sum + m.revenue, 0);

            // Mocking actions and action_values for compatibility with HourlyReport.js
            // In a real scenario, these would come from a more granular event log or JSON column
            const actions = [
                { action_type: 'link_click', value: clicks },
                { action_type: 'lead', value: leads },
                { action_type: 'purchase', value: purchases }
            ];

            const action_values = [
                { action_type: 'purchase', value: revenue }
            ];

            return {
                hour: hourStr,
                spend,
                impressions,
                clicks,
                actions,
                action_values,
                leads,
                purchases,
                revenue
            };
        });

        return NextResponse.json({ success: true, data: aggregated });
    } catch (error) {
        logger.error('[MarketingHourly]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
