import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/products/[id]/stats
 * Returns full product detail + enrollment stats for POS product modal
 *
 * Response:
 *   product        — full product record
 *   totalSold      — count of all ACTIVE/COMPLETED enrollments
 *   pendingStudents — count of enrollment items status=PENDING (bought, not attended)
 *   completedStudents — count of enrollment items status=COMPLETED
 */
export async function GET(request, { params }) {
    try {
        const prisma = await getPrisma();
        const { id } = params;

        // Fetch product
        const product = await prisma.product.findFirst({
            where: {
                OR: [{ id }, { productId: id }],
                isActive: true,
            },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Enrollment stats — parallel queries
        const [totalSold, pendingStudents, completedStudents] = await Promise.all([
            // Total enrollments ever sold for this product
            prisma.enrollment.count({
                where: {
                    productId: product.id,
                    status: { in: ['ACTIVE', 'COMPLETED'] },
                },
            }),
            // Students who bought but haven't started/completed yet
            prisma.enrollmentItem.count({
                where: {
                    productId: product.id,
                    status: 'PENDING',
                },
            }),
            // Students who completed this course
            prisma.enrollmentItem.count({
                where: {
                    productId: product.id,
                    status: 'COMPLETED',
                },
            }),
        ]);

        return NextResponse.json({
            product,
            stats: {
                totalSold,
                pendingStudents,   // ซื้อแล้ว ยังไม่ได้เรียน
                completedStudents, // เรียนจบแล้ว
                inProgressStudents: Math.max(0, totalSold - pendingStudents - completedStudents),
            },
        });
    } catch (error) {
        logger.error('ProductStatsAPI', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
