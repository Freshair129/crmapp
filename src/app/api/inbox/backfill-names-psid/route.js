import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const GRAPH = 'https://graph.facebook.com/v19.0';

/**
 * POST /api/inbox/backfill-names-psid
 * Body: { psids: string[] }  — optional, defaults to all null-firstName FB customers
 *
 * Queries FB Graph API User node /{PSID}?fields=name directly.
 * This is NOT limited to 90-day conversation window — works for any user
 * who has ever messaged the page (as long as page has pages_messaging permission).
 */
export async function POST(request) {
    const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!PAGE_TOKEN) {
        return NextResponse.json({ error: 'FB_PAGE_ACCESS_TOKEN not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));

    try {
        const prisma = await getPrisma();

        // Get PSIDs to look up — either from body or all null-firstName FB customers
        let targets;
        if (body.psids?.length) {
            targets = await prisma.customer.findMany({
                where: { facebookId: { in: body.psids } },
                select: { id: true, facebookId: true }
            });
        } else {
            targets = await prisma.customer.findMany({
                where: { facebookId: { not: null }, firstName: null },
                select: { id: true, facebookId: true }
            });
        }

        if (targets.length === 0) {
            return NextResponse.json({ updated: 0, message: 'No targets found' });
        }

        logger.info('[BackfillNamesPSID]', `Looking up ${targets.length} PSIDs via User node`);

        // Query FB Graph API in batches of 10 using batch request
        const results = { updated: 0, failed: 0, notFound: 0, errors: [] };
        const batchSize = 10;

        for (let i = 0; i < targets.length; i += batchSize) {
            const batch = targets.slice(i, i + batchSize);

            // Use FB Batch API to fetch multiple users at once
            const batchRequests = batch.map(t => ({
                method: 'GET',
                relative_url: `${t.facebookId}?fields=name`
            }));

            const batchRes = await fetch(`${GRAPH}?access_token=${PAGE_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch: batchRequests })
            });

            if (!batchRes.ok) {
                logger.error('[BackfillNamesPSID]', `Batch request failed: ${batchRes.status}`);
                results.failed += batch.length;
                continue;
            }

            const batchData = await batchRes.json();

            for (let j = 0; j < batch.length; j++) {
                const target = batch[j];
                const response = batchData[j];

                if (!response || response.code !== 200) {
                    results.notFound++;
                    logger.warn('[BackfillNamesPSID]', `PSID ${target.facebookId} → code ${response?.code}`);
                    continue;
                }

                try {
                    const userData = JSON.parse(response.body);
                    if (!userData.name) {
                        results.notFound++;
                        continue;
                    }

                    const [firstName, ...rest] = userData.name.trim().split(' ');
                    const lastName = rest.join(' ') || null;

                    // Update customer
                    await prisma.customer.update({
                        where: { id: target.id },
                        data: { facebookName: userData.name, firstName, lastName }
                    });

                    // Also update conversation participantName if null
                    await prisma.conversation.updateMany({
                        where: { participantId: target.facebookId, participantName: null },
                        data: { participantName: userData.name }
                    });

                    results.updated++;
                    logger.info('[BackfillNamesPSID]', `✓ ${target.facebookId} → ${userData.name}`);
                } catch (e) {
                    results.errors.push(`${target.facebookId}: ${e.message}`);
                    results.failed++;
                }
            }

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < targets.length) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        logger.info('[BackfillNamesPSID]', `Done: ${results.updated} updated, ${results.notFound} not found, ${results.failed} failed`);
        return NextResponse.json({ ...results, total: targets.length });

    } catch (error) {
        logger.error('[BackfillNamesPSID]', 'error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
