import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET() {
    try {
        const prisma = await getPrisma();
        const rules = await prisma.notificationRule.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(rules);
    } catch (error) {
        logger.error('[NotificationRules]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const prisma = await getPrisma();
        const body = await request.json();
        const { ruleId, name, description, event, conditions, actions, isActive } = body;

        if (!name || !event) {
            return NextResponse.json({ error: 'Name and Event are required' }, { status: 400 });
        }

        const data = {
            name,
            description,
            event,
            conditions: conditions || {},
            actions: actions || {},
            isActive: isActive !== undefined ? isActive : true,
        };

        let result;
        if (ruleId) {
            result = await prisma.notificationRule.upsert({
                where: { ruleId },
                update: data,
                create: { ...data, ruleId },
            });
            logger.info('[NotificationRules]', `Upserted rule: ${ruleId}`);
        } else {
            // Generate standard ruleId: NOT-[YYYYMMDD]-[SERIAL]
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await prisma.notificationRule.count();
            const serial = String(count + 1).padStart(3, '0');
            const generatedId = `NOT-${dateStr}-${serial}`;

            result = await prisma.notificationRule.create({
                data: { ...data, ruleId: generatedId },
            });
            logger.info('[NotificationRules]', `Created new rule: ${generatedId}`);
        }

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[NotificationRules]', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
