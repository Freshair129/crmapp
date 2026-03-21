import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/lib/idGenerators';

/**
 * POST /api/customers/sync
 * Syncs unlinked Facebook Messenger conversations → creates Customer records
 */
export async function POST() {
    let created = 0;
    let skipped = 0;
    const errors = [];

    try {
        const prisma = await getPrisma();

        const unlinked = await prisma.conversation.findMany({
            where: {
                customerId: null,
                participantId: { not: null },
                channel: 'facebook',
            },
            select: {
                id: true,
                conversationId: true,
                participantId: true,
                participantName: true,
            },
        });

        for (const conv of unlinked) {
            try {
                const result = await prisma.$transaction(async (tx) => {
                    // Check if customer already exists with this facebookId
                    const existing = await tx.customer.findUnique({
                        where: { facebookId: conv.participantId },
                    });

                    if (existing) {
                        // Just link the conversation
                        await tx.conversation.update({
                            where: { id: conv.id },
                            data: { customerId: existing.id },
                        });
                        return { action: 'skipped' };
                    }

                    const customerId = await generateCustomerId('FB');
                    const firstName = conv.participantName
                        ? conv.participantName.split(' ')[0]
                        : 'Unknown';

                    const customer = await tx.customer.create({
                        data: {
                            customerId,
                            facebookId: conv.participantId,
                            facebookName: conv.participantName,
                            firstName,
                            lifecycleStage: 'Lead',
                            status: 'Active',
                        },
                    });

                    await tx.conversation.update({
                        where: { id: conv.id },
                        data: { customerId: customer.id },
                    });

                    return { action: 'created' };
                });

                if (result.action === 'created') created++;
                else skipped++;
            } catch (err) {
                logger.error('[CustomerSync]', `Failed to sync conversation ${conv.conversationId}`, err);
                errors.push(`conversation ${conv.conversationId}: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, created, skipped, errors });
    } catch (error) {
        logger.error('[CustomerSync]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
    }
}
