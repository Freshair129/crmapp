import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function DELETE(request, { params }) {
    const { id } = params; // This is the UUID or ruleId? Prisma usually handles UUID here.
    
    try {
        const prisma = await getPrisma();
        
        // Find by UUID first, then by ruleId if not found
        let rule = await prisma.notificationRule.findFirst({
            where: {
                OR: [
                    { id: id },
                    { ruleId: id }
                ]
            }
        });

        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        await prisma.notificationRule.delete({
            where: { id: rule.id }
        });

        logger.info('[NotificationRules]', `Deleted rule: ${rule.ruleId}`);
        return NextResponse.json({ success: true, deleted: rule.ruleId });
    } catch (error) {
        logger.error('[NotificationRules]', 'DELETE error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
