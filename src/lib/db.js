import { mockPrismaClient } from './mockPrisma.js';

/**
 * Standard getPrisma singleton facade as per GEMINI.md
 * ใช้ mock data เนื่องจาก DB connection ไม่พร้อม
 * @returns {Promise<import('@prisma/client').PrismaClient>}
 */
export async function getPrisma() {
    return mockPrismaClient;
}
