import { getPrisma } from '@/lib/db';
import { generateCustomerId } from '@/utils/idGenerator';

/**
 * @param {{ limit?: number, offset?: number, search?: string }} opts
 */
export async function getAllCustomers(opts = {}) {
    const prisma = await getPrisma();
    const { limit, offset, search } = opts;

    return prisma.customer.findMany({
        take: limit,
        skip: offset,
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
