import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const FB_GRAPH = 'https://graph.facebook.com/v19.0';

/**
 * POST /api/inbox/backfill-names
 * Fetch Facebook display names for customers with null first_name.
 * Calls FB Graph API /{psid}?fields=name for each, updates customer record.
 */
export async function POST(request) {
    const token = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_PAGE_ACCESS_TOKEN not configured' }, { status: 503 });
    }

    try {
        const prisma = await getPrisma();

        // Get all FB customers missing a name
        const customers = await prisma.customer.findMany({
            where: {
                facebookId: { not: null },
                firstName: null,
            },
            select: { id: true, facebookId: true },
            take: 50 // batch cap — call again if more remain
        });

        if (customers.length === 0) {
            return NextResponse.json({ updated: 0, message: 'All FB customers already have names' });
        }

        let updated = 0;
        let failed = 0;

        for (const cust of customers) {
            try {
                const res = await fetch(
                    `${FB_GRAPH}/${cust.facebookId}?fields=name&access_token=${token}`
                );
                const data = await res.json();

                if (!res.ok || data.error || !data.name) {
                    logger.warn('[BackfillNames]', `No name for PSID ${cust.facebookId}`, data.error?.message);
                    failed++;
                    continue;
                }

                const [firstName, ...rest] = data.name.trim().split(' ');
                await prisma.customer.update({
                    where: { id: cust.id },
                    data: {
                        facebookName: data.name,
                        firstName,
                        lastName: rest.join(' ') || null,
                    }
                });
                updated++;
            } catch (err) {
                logger.error('[BackfillNames]', `Failed for ${cust.facebookId}`, err);
                failed++;
            }
        }

        logger.info('[BackfillNames]', `Done: ${updated} updated, ${failed} failed out of ${customers.length}`);
        return NextResponse.json({
            total: customers.length,
            updated,
            failed,
            hasMore: customers.length === 50
        });
    } catch (error) {
        logger.error('[BackfillNames]', 'Backfill error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
