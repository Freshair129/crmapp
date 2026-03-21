import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/lib/idGenerators';
import { normalizeThai, bestMatchScore, rankByNameMatch } from '@/lib/thaiNameMatcher';

/**
 * @param {{ limit?: number, offset?: number, search?: string, fuzzy?: boolean }} opts
 */
export async function getAllCustomers(opts = {}) {
    const prisma = await getPrisma();
    const { limit, offset, search, fuzzy } = opts;

    // Standard exact/contains search
    const customers = await prisma.customer.findMany({
        take: fuzzy && search ? 100 : limit,  // Fetch wider for fuzzy re-ranking
        skip: fuzzy ? undefined : offset,
        where: search ? {
            OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { nickName: { contains: search, mode: 'insensitive' } },
                { phonePrimary: { contains: search } }
            ]
        } : undefined,
        orderBy: { createdAt: 'desc' }
    });

    // If fuzzy mode and exact search returned few results, broaden + re-rank
    if (fuzzy && search && customers.length < 3) {
        const broadResults = await prisma.customer.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            where: {
                OR: [
                    // Use first 2 chars as a loose prefix filter for Thai names
                    { firstName: { not: null } },
                ]
            }
        });

        const ranked = rankByNameMatch(search, broadResults.map(c => ({
            ...c,
            facebookName: c.facebookName || undefined,
        })), 0.6);

        // Merge: exact matches first, then fuzzy matches (deduplicated)
        const seenIds = new Set(customers.map(c => c.id));
        const fuzzyExtras = ranked
            .filter(r => !seenIds.has(r.record.id))
            .map(r => r.record);

        const merged = [...customers, ...fuzzyExtras];
        return limit ? merged.slice(0, limit) : merged;
    }

    return customers;
}

/**
 * @param {string} id
 */
export async function getCustomerById(id) {
    const prisma = await getPrisma();
    return prisma.customer.findUnique({
        where: { id },
        include: {
            orders: {
                take: 5,
                orderBy: { date: 'desc' }
            },
            conversations: {
                take: 3,
                orderBy: { updatedAt: 'desc' }
            }
        }
    });
}

/**
 * @param {string} psid
 * @param {{ name: string, channel: string, originId?: string }} data
 */
export async function upsertCustomerByPsid(psid, data) {
    const prisma = await getPrisma();
    return prisma.customer.upsert({
        where: { facebookId: psid },
        update: {
            firstName: data.name,
            originId: data.originId
        },
        create: {
            customerId: await generateCustomerId('FB'),
            facebookId: psid,
            firstName: data.name,
            originId: data.originId,
            lifecycleStage: 'Lead'
        }
    });
}

/**
 * @param {string} phone
 * @param {any} data
 */
export async function upsertCustomerByPhone(phone, data) {
    const prisma = await getPrisma();
    // phonePrimary is NOT unique in schema, so we find and then update or create
    const existing = await prisma.customer.findFirst({
        where: { phonePrimary: phone }
    });

    if (existing) {
        return prisma.customer.update({
            where: { id: existing.id },
            data
        });
    }

    return prisma.customer.create({
        data: {
            ...data,
            phonePrimary: phone,
            customerId: await generateCustomerId('PH')
        }
    });
}

// ─── V Point & Loyalty Tier ────────────────────────────────────────────────

/**
 * Tier config — Boss can edit thresholds here
 * Higher tiers (TIER3+) require both spending AND learning hours
 */
export const TIER_CONFIG = [
    { tier: 'TIER1', label: 'V Member',   minSpend: 0,      minHours: 0,   color: '#9CA3AF', badge: '🥈' },
    { tier: 'TIER2', label: 'V Silver',   minSpend: 20000,  minHours: 0,   color: '#C0C0C0', badge: '🥈' },
    { tier: 'TIER3', label: 'V Gold',     minSpend: 50000,  minHours: 30,  color: '#C9A34E', badge: '🥇' },
    { tier: 'TIER4', label: 'V Platinum', minSpend: 100000, minHours: 111, color: '#E5E4E2', badge: '💎' },
    { tier: 'TIER5', label: 'V Black',    minSpend: 200000, minHours: 201, color: '#1a1a2e', badge: '⬛' },
];

/** 300 V Point ทุกๆ 150 THB */
export const VP_RATE = { pointsPerUnit: 300, spendPerUnit: 150 };

/**
 * คำนวณ tier จาก totalSpend + totalHours
 * @param {number} totalSpend - ยอดสะสม THB
 * @param {number} totalHours - ชั่วโมงเรียนสะสม
 * @returns {{ tier, label, color, badge, nextTier, progressSpend, progressHours }}
 */
export function calculateTier(totalSpend = 0, totalHours = 0) {
    // หา tier สูงสุดที่ผ่านเงื่อนไขทั้งคู่
    let current = TIER_CONFIG[0];
    for (const t of TIER_CONFIG) {
        if (totalSpend >= t.minSpend && totalHours >= t.minHours) {
            current = t;
        }
    }

    const currentIdx = TIER_CONFIG.indexOf(current);
    const next = TIER_CONFIG[currentIdx + 1] || null;

    return {
        ...current,
        nextTier: next,
        progressSpend: next ? Math.min(100, Math.round((totalSpend / next.minSpend) * 100)) : 100,
        progressHours: next && next.minHours > 0
            ? Math.min(100, Math.round((totalHours / next.minHours) * 100))
            : 100,
    };
}

/**
 * คำนวณ V Point ที่ได้จากยอดชำระ
 * @param {number} amount - ยอดชำระ THB
 * @returns {number} V Point ที่ได้
 */
export function calcVPoints(amount) {
    return Math.floor(amount / VP_RATE.spendPerUnit) * VP_RATE.pointsPerUnit;
}

/**
 * บันทึก V Point + อัปเดต totalSpend + recalculate tier
 * เรียกหลัง processOrder สำเร็จ
 * @param {string} customerId - customer.id (UUID)
 * @param {number} orderAmount - ยอดชำระจริง THB (finalTotal)
 * @param {number} totalHours - ชั่วโมงเรียนสะสมปัจจุบัน (จาก enrollment)
 */
export async function awardVPoints(customerId, orderAmount, totalHours = 0) {
    if (!customerId || customerId === 'guest-customer-00000000-0000-0000-0000-000000000000') return null;

    const prisma = await getPrisma();
    const earned = calcVPoints(orderAmount);

    // อ่าน totalSpend ปัจจุบัน
    const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { vpPoints: true, totalVpEarned: true, totalSpend: true }
    });
    if (!customer) return null;

    const newTotalSpend = (customer.totalSpend || 0) + orderAmount;
    const tierInfo = calculateTier(newTotalSpend, totalHours);

    return prisma.customer.update({
        where: { id: customerId },
        data: {
            vpPoints:      { increment: earned },
            totalVpEarned: { increment: earned },
            totalSpend:    { increment: orderAmount },
            membershipTier: tierInfo.tier,
        }
    });
}
