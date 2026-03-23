import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getPackageEnrollmentByQrToken } from '@/lib/repositories/packageRepo';
import { updateEnrollmentItemHours } from '@/lib/repositories/enrollmentRepo';
import { getPrisma } from '@/lib/db';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { qrToken, productId, scheduleId, hoursAttended, note } = body;

        if (!qrToken) return NextResponse.json({ error: 'qrToken is required' }, { status: 400 });
        if (!hoursAttended || hoursAttended <= 0) return NextResponse.json({ error: 'hoursAttended must be > 0' }, { status: 400 });

        // 1. Look up PackageEnrollment by QR token
        const pkgEnrollment = await getPackageEnrollmentByQrToken(qrToken);
        if (!pkgEnrollment) return NextResponse.json({ error: 'Invalid QR token' }, { status: 404 });
        if (pkgEnrollment.status !== 'ACTIVE') return NextResponse.json({ error: 'Enrollment is not active' }, { status: 400 });

        // 2. Find the matching EnrollmentItem
        let targetCourse = null;
        if (productId) {
            targetCourse = pkgEnrollment.selectedCourses.find(c => c.productId === productId);
        } else if (pkgEnrollment.selectedCourses.length === 1) {
            targetCourse = pkgEnrollment.selectedCourses[0];
        }

        if (!targetCourse) return NextResponse.json({ error: 'productId required — multiple courses in package' }, { status: 400 });
        if (!targetCourse.enrollmentItem) return NextResponse.json({ error: 'No linked enrollment item found' }, { status: 400 });

        const enrollmentItemId = targetCourse.enrollmentItem.id;

        // 3. Create ClassAttendance record (if scheduleId provided)
        if (scheduleId) {
            const prisma = await getPrisma();
            try {
                await prisma.classAttendance.create({
                    data: {
                        enrollmentItemId,
                        scheduleId,
                        hoursAttended: Number(hoursAttended),
                        note: note || null
                    }
                });
            } catch (err) {
                if (err.code === 'P2002') {
                    return NextResponse.json({ error: 'Already checked in for this schedule' }, { status: 409 });
                }
                throw err;
            }
        }

        // 4. Update hours on EnrollmentItem
        const updatedItem = await updateEnrollmentItemHours(enrollmentItemId, Number(hoursAttended));

        logger.info('[AttendanceScan]', `Scanned ${pkgEnrollment.customer.firstName} — ${targetCourse.product.name} +${hoursAttended}h`);

        return NextResponse.json({
            success: true,
            customer: pkgEnrollment.customer,
            packageName: pkgEnrollment.package.name,
            courseName: targetCourse.product.name,
            hoursAttended: Number(hoursAttended),
            totalHoursCompleted: updatedItem.hoursCompleted,
            courseStatus: updatedItem.status,
            certLevel: updatedItem.certLevel
        });
    } catch (error) {
        logger.error('[AttendanceScan]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
