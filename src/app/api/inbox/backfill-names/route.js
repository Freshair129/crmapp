import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const GRAPH = 'https://graph.facebook.com/v19.0';

/**
 * POST /api/inbox/backfill-names
 * Uses FB conversations/participants to backfill customer names.
 * Optimised for Vercel 10s timeout: 1-3 FB API calls + 1 DB transaction.
 */
export async function POST() {
    const PAGE_ID = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!PAGE_ID || !token) {
        return NextResponse.json({ error: 'FB credentials not configured' }, { status: 503 });
    }

    try {
        // Step 1: fetch participant names from FB (1-3 API calls)
        const psidToName = {};
        let cursor = null;

        for (let page = 0; page < 3; page++) {
            const url = new URL(`${GRAPH}/${PAGE_ID}/conversations`);
            url.searchParams.set('access_token', token);
            url.searchParams.set('fields', 'participants');
            url.searchParams.set('limit', '25');
            if (cursor) url.searchParams.set('after', cursor);

            const res = await fetch(url.toString());
            const data = await res.json();

            if (!res.ok || data.error) {
                const msg = data.error?.message || `Graph API ${res.status}`;
                return NextResponse.json({ error: msg }, { status: 502 });
            }

            for (const conv of (data.data || [])) {
                const participants = conv.participants?.data || [];
                const cust = participants.find(p => p.id !== PAGE_ID);
                if (cust?.id && cust?.name) psidToName[cust.id] = cust.name;
            }

            cursor = data.paging?.cursors?.after;
            if (!cursor || !data.paging?.next) break;
        }

        const psids = Object.keys(psidToName);
        if (psids.length === 0) {
            return NextResponse.json({ updated: 0, message: 'No participants found' });
        }

        // Step 2: single DB transaction — find + update all at once
        const prisma = await getPrisma();
        const customers = await prisma.customer.findMany({
            where: { facebookId: { in: psids }, firstName: null },
            select: { id: true, facebookId: true }
        });

        if (customers.length === 0) {
            return NextResponse.json({ updated: 0, message: 'All customers already have names' });
        }

        await prisma.$transaction(
            customers.map(c => {
                const name = psidToName[c.facebookId];
                const [firstName, ...rest] = name.trim().split(' ');
                return prisma.customer.update({
                    where: { id: c.id },
                    data: { facebookName: name, firstName, lastName: rest.join(' ') || null }
                });
            })
        );

        logger.info('[BackfillNames]', `Updated ${customers.length} customers`);
        return NextResponse.json({ updated: customers.length, total_participants: psids.length });
    } catch (error) {
        logger.error('[BackfillNames]', 'error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
