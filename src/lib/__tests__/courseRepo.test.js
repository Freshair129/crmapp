// FILE: src/lib/__tests__/courseRepo.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as courseRepo from '@/lib/repositories/courseRepo';
import * as coursesRoute from '@/app/api/courses/route';
import * as courseIdRoute from '@/app/api/courses/[id]/route';
import * as courseMenusRoute from '@/app/api/courses/[id]/menus/route';
import * as courseEquipmentRoute from '@/app/api/courses/[id]/equipment/route';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn()
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

describe('Course Management Unit Tests (Phase 17)', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            product: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                findUnique: vi.fn()
            },
            courseMenu: {
                create: vi.fn(),
                delete: vi.fn()
            },
            courseEquipment: {
                create: vi.fn(),
                delete: vi.fn()
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);

        // Mock Date for ID generation: 2026-03-16 (Year 2026)
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-16'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('courseRepo.js', () => {
        
        // 1. listCourses()
        it('listCourses - ควรดึงข้อมูลคอร์สที่ category in COURSE_CATEGORIES และรวม relations ที่เกี่ยวข้อง', async () => {
            mockPrisma.product.findMany.mockResolvedValue([{ id: 'c1', name: 'Thai Food' }]);
            const result = await courseRepo.listCourses({ isActive: true });

            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { category: { in: expect.arrayContaining(['course', 'japanese_culinary']) }, isActive: true },
                include: expect.objectContaining({
                    courseMenus: expect.anything(),
                    courseEquipment: expect.anything()
                }),
                orderBy: { name: 'asc' }
            }));
            expect(result).toHaveLength(1);
        });

        // 2 & 8. createCourse() and generateCourseId()
        it('createCourse - ควรสร้างคอร์สใหม่พร้อม generate ID format TVS-[CUISINE]-[PACK]-[SUBCAT]-[NN]', async () => {
            // Mock generateProductId internal call (findFirst for prefix TVS-JP-2FC-HO-)
            mockPrisma.product.findFirst.mockResolvedValue({ productId: 'TVS-JP-2FC-HO-05' });
            mockPrisma.product.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new-uid', ...data }));

            const courseData = {
                name: 'Ramen Master',
                price: 2500,
                hours: 15,
                days: 2
            };
            const result = await courseRepo.createCourse(courseData);

            // Default cuisine=JP, pack=2FC, subcat=HO → TVS-JP-2FC-HO-06
            expect(result.productId).toBe('TVS-JP-2FC-HO-06');
            expect(result.category).toBe('course');
            expect(result.price).toBe(2500);
            expect(result.hours).toBe(15);
            expect(mockPrisma.product.create).toHaveBeenCalled();
        });

        // 3. updateCourse()
        it('updateCourse - ควร update เฉพาะ field ที่ส่งมา (partial update)', async () => {
            mockPrisma.product.update.mockResolvedValue({ id: 'c1', name: 'Updated Name' });
            
            await courseRepo.updateCourse('c1', { name: 'Updated Name', hours: undefined });

            expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'c1' },
                data: { name: 'Updated Name' } // hours should not be in data if undefined
            }));
        });

        // 4. addCourseMenu()
        it('addCourseMenu - ควรสร้าง CourseMenu และ throw error ถ้าซ้ำ (P2002)', async () => {
            mockPrisma.courseMenu.create.mockResolvedValue({ id: 'm1' });
            await courseRepo.addCourseMenu('prod-1', { recipeId: 'rec-1', dayNumber: 1 });

            expect(mockPrisma.courseMenu.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ productId: 'prod-1', recipeId: 'rec-1' })
            }));

            // Test unique violation
            const error = new Error('Unique violation');
            error.code = 'P2002';
            mockPrisma.courseMenu.create.mockRejectedValueOnce(error);
            await expect(courseRepo.addCourseMenu('p1', { recipeId: 'r1' })).rejects.toThrow('Unique violation');
        });

        // 5. removeCourseMenu()
        it('removeCourseMenu - ควรเรียก delete ด้วย ID ที่ถูกต้อง', async () => {
            await courseRepo.removeCourseMenu('m1');
            expect(mockPrisma.courseMenu.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
        });

        // 6. addCourseEquipment()
        it('addCourseEquipment - ควรสร้าง CourseEquipment โดยมี isIncluded default เป็น true', async () => {
            mockPrisma.courseEquipment.create.mockResolvedValue({ id: 'e1' });
            await courseRepo.addCourseEquipment('p1', { name: 'Apron' });

            expect(mockPrisma.courseEquipment.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ name: 'Apron', isIncluded: true })
            }));
        });

        // 7. removeCourseEquipment()
        it('removeCourseEquipment - ควรเรียก delete ด้วย ID ที่ถูกต้อง', async () => {
            await courseRepo.removeCourseEquipment('eq1');
            expect(mockPrisma.courseEquipment.delete).toHaveBeenCalledWith({ where: { id: 'eq1' } });
        });
    });

    describe('API Routes', () => {
        // GET /api/courses
        it('GET /api/courses - ควรคืนค่ารายการคอร์สและรองรับ isActive filter', async () => {
            const spy = vi.spyOn(courseRepo, 'listCourses').mockResolvedValue([]);
            const req = { url: 'http://localhost/api/courses?isActive=true' };
            
            const res = await coursesRoute.GET(req);
            expect(res.status).toBe(200);
            expect(spy).toHaveBeenCalledWith({ isActive: true });
        });

        // POST /api/courses
        it('POST /api/courses - ควรตรวจสอบ validation และคืนค่า 201 เมื่อสำเร็จ', async () => {
            const spy = vi.spyOn(courseRepo, 'createCourse').mockResolvedValue({ id: 'new' });
            
            // Validation fail
            const badReq = { json: () => Promise.resolve({ name: '' }) };
            const badRes = await coursesRoute.POST(badReq);
            expect(badRes.status).toBe(400);

            // Success
            const goodReq = { json: () => Promise.resolve({ name: 'Course', price: 1000 }) };
            const goodRes = await coursesRoute.POST(goodReq);
            expect(goodRes.status).toBe(201);
            expect(spy).toHaveBeenCalled();
        });

        // GET /api/courses/[id]
        it('GET /api/courses/[id] - ควรคืนค่า 404 ถ้าไม่พบคอร์ส', async () => {
            vi.spyOn(courseRepo, 'getCourse').mockResolvedValue(null);
            const res = await courseIdRoute.GET({}, { params: { id: 'none' } });
            expect(res.status).toBe(404);
        });

        // POST /api/courses/[id]/menus (add recipe)
        it('POST /api/courses/[id]/menus - ควรจัดการ duplicate recipe (409)', async () => {
            const error = new Error('P2002');
            error.code = 'P2002';
            vi.spyOn(courseRepo, 'addCourseMenu').mockRejectedValue(error);

            const req = { json: () => Promise.resolve({ recipeId: 'r1' }) };
            const res = await courseMenusRoute.POST(req, { params: { id: 'c1' } });

            expect(res.status).toBe(409);
        });

        // DELETE /api/courses/[id]/menus
        it('DELETE /api/courses/[id]/menus - ควรตรวจสอบ query param [menuId]', async () => {
            const req = { url: 'http://localhost/api/courses/c1/menus' }; // No menuId
            const res = await courseMenusRoute.DELETE(req, { params: { id: 'c1' } });
            expect(res.status).toBe(400);
        });
    });
});
