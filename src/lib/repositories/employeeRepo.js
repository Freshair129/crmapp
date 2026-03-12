import { getPrisma } from '@/lib/db';

/**
 * @param {{ status?: string }} opts
 */
export async function getAllEmployees(opts = {}) {
    const prisma = await getPrisma();
    return prisma.employee.findMany({
        where: opts.status ? { status: opts.status } : undefined,
        orderBy: { firstName: 'asc' }
    });
}

/**
 * @param {string} id
 */
export async function getEmployeeById(id) {
    const prisma = await getPrisma();
    return prisma.employee.findUnique({
        where: { id }
    });
}

/**
 * @param {string} fbName
 */
export async function getEmployeeByFbName(fbName) {
    const prisma = await getPrisma();
    return prisma.employee.findFirst({
        where: {
            identities: {
                path: ['facebook', 'name'],
                equals: fbName
            }
        }
    });
}
