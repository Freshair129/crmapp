import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const GRAPH = 'https://graph.facebook.com/v19.0';

/**
 * POST /api/inbox/backfill-names
 * Use FB /conversations?fields=participants to populate customer names.
 * Unlike /{psid}?fields=name (now blocked), participants data is returned
 * as part of conversation objects and is always accessible.
 */
export async function POST(request) {
    const PAGE_ID = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!PAGE_ID || !token) {
        return NextResponse.json({ error: 'FB credentials not configured' }, { status: 503 });
    }

    try {
        const prisma = await getPrisma();
        let updated = 0;
        let cursor = null;

        // Fetch up to 3 pages of conversations (75 convs) with participant names
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
                logger.error('[BackfillNames]', msg);
                return NextResponse.json({ error: msg }, { status: 502 });
            }

            const conversations = data.data || [];
            if (conversations.length === 0) break;

            // For each conversation, find the customer participant and update their name
            await Promise.all(conversations.map(async (conv) => {
                const participants = conv.participants?.data || [];
                const customer = participants.find(p => p.id !== PAGE_ID);
                if (!customer?.name || !customer?.id) return;

                const [firstName, ...rest] = customer.name.trim().split(' ');

                // Only update customers with no first_name set
                await prisma.customer.updateMany({
                    where: {
                        facebookId: customer.id,
                        firstName: null
                    },
                    data: {
                        facebookName: customer.name,
                        firstName,
                        lastName: rest.join(' ') || null,
                    }
                });
                updated++;
            }));

            cursor = data.paging?.cursors?.after;
            if (!cursor || !data.paging?.next) break;
        }

        logger.info('[BackfillNames]', `Done: ~${updated} customers updated`);
        return NextResponse.json({ updated, source: 'conversations/participants' });
    } catch (error) {
        logger.error('[BackfillNames]', 'Backfill error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
