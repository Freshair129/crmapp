import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { createPackageEnrollment, getPackageEnrollmentsByCustomer } from '@/lib/repositories/packageRepo';

export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        if (!customerId) return NextResponse.json({ error: 'customerId is required' }, { status: 400 });

        const data = await getPackageEnrollmentsByCustomer(customerId);
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[PackageEnrollments]', 'GET failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { packageId, customerId, soldById, totalPrice, selectedCourseIds, notes } = body;

        if (!packageId || !customerId || totalPrice === undefined) {
            return NextResponse.json({ error: 'packageId, customerId, and totalPrice are required' }, { status: 400 });
        }

        const enrollment = await createPackageEnrollment({ packageId, customerId, soldById, totalPrice, selectedCourseIds, notes });
        logger.info('[PackageEnrollments]', `Created enrollment ${enrollment.enrollmentId} for customer ${customerId}`);
        return NextResponse.json(enrollment, { status: 201 });
    } catch (error) {
        logger.error('[PackageEnrollments]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
