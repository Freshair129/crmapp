/**
 * Prisma client — ใช้ mock data เนื่องจาก DB connection ไม่พร้อม
 */
// @ts-ignore
import mockClient from './mockPrisma.js';

export function getInternalPrisma(): any {
  return mockClient;
}

export async function getPrisma(): Promise<any> {
  return mockClient;
}
