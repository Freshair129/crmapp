import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/utils/idGenerator';
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
