import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { generateCustomerId, generateMemberId } from '@/utils/idGenerator';
import { logger } from '@/lib/logger';

// Intent code map: course interest → MEM intent char
const INTENT_MAP = {
    pro:      'P',  // เชฟมืออาชีพ
    business: 'B',  // เปิดร้าน/ธุรกิจ
    hobby:    'H',  // ทำเองกินเอง/งานอดิเรก
};

/**
 * POST /api/members/register — Public endpoint (no auth required)
 * Body: { firstName, lastName, nickName?, phone, email?, lineId?, interest, source? }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { firstName, lastName, nickName, phone, email, lineId, interest, source } = body;

        if (!firstName || !phone) {
            return NextResponse.json(
                { error: 'firstName และ phone จำเป็นต้องกรอก' },
                { status: 400 }
            );
        }

        const prisma = await getPrisma();

        // Check duplicate by phone
        const existing = await prisma.customer.findFirst({
            where: { phonePrimary: phone },
            select: { id: true, customerId: true, memberId: true },
        });
        if (existing) {
            return NextResponse.json(
                { error: 'เบอร์โทรนี้ลงทะเบียนแล้ว', customerId: existing.customerId },
                { status: 409 }
            );
        }

        const intent  = INTENT_MAP[(interest || 'hobby').toLowerCase()] ?? 'H';
        const customer = await prisma.$transaction(async (tx) => {
            const customerId = await generateCustomerId('WB');
            const memberId   = await generateMemberId('TVS', intent);

            return tx.customer.create({
                data: {
                    customerId,
                    memberId,
                    status: 'Active',
                    firstName,
                    lastName:       lastName  || null,
                    nickName:       nickName  || null,
                    phonePrimary:   phone,
                    email:          email     || null,
                    lineId:         lineId    || null,
                    membershipTier: 'MEMBER',
                    lifecycleStage: 'Lead',
                    joinDate:       new Date(),
                    intelligence: {
                        source:   { channel: source || 'web_register' },
                        interest: interest || 'hobby',
                    },
                },
                select: {
                    id: true,
                    customerId: true,
                    memberId: true,
                    firstName: true,
                    lastName: true,
                    membershipTier: true,
                },
            });
        });

        logger.info('MemberRegister', `New member: ${customer.memberId}`, { phone });
        return NextResponse.json({ success: true, data: customer }, { status: 201 });

    } catch (err) {
        logger.error('MemberRegister', 'POST error', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
