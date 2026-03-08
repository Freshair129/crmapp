import { prisma } from './prisma';

/**
 * Standard getPrisma singleton facade as per GEMINI.md
 * @returns {Promise<import('@prisma/client').PrismaClient>}
 */
export async function getPrisma() {
    return prisma;
}
