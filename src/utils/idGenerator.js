import { getPrisma } from '../lib/db.js';

/**
 * Generates a standardized Customer ID: TVS-CUS-[CHANNEL]-[YEAR]-[SERIAL]
 * @param {string} channel - FB, LN, WB, etc.
 * @returns {Promise<string>}
 */
export async function generateCustomerId(channel = 'WB') {
    const prisma = await getPrisma();
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `TVS-CUS-${channel}-${year}-`;

    // Find the last serial for this year and channel
    const lastCustomer = await prisma.customer.findFirst({
        where: {
            customerId: {
                startsWith: prefix,
            },
        },
        orderBy: {
            customerId: 'desc',
        },
    });

    let nextSerial = 1;
    if (lastCustomer) {
        const lastSerialStr = lastCustomer.customerId.split('-').pop();
        nextSerial = parseInt(lastSerialStr, 10) + 1;
    }

    return `${prefix}${nextSerial.toString().padStart(4, '0')}`;
}

/**
 * Generates a standardized Member ID: MEM-[YY][AGENT][INTENT]-[SERIAL]
 * @param {string} agent - e.g., BKK
 * @param {string} intent - P (Pro), B (Business), H (Hobby)
 * @returns {Promise<string>}
 */
export async function generateMemberId(agent = 'BKK', intent = 'P') {
    const prisma = await getPrisma();
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `MEM-${year}${agent}${intent}-`;

    const lastMember = await prisma.customer.findFirst({
        where: {
            memberId: {
                startsWith: prefix,
            },
        },
        orderBy: {
            memberId: 'desc',
        },
    });

    let nextSerial = 1;
    if (lastMember) {
        const lastSerialStr = lastMember.memberId.split('-').pop();
        nextSerial = parseInt(lastSerialStr, 10) + 1;
    }

    return `${prefix}${nextSerial.toString().padStart(4, '0')}`;
}
