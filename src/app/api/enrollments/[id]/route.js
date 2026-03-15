import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getEnrollmentById, updateEnrollmentItemHours } from '@/lib/repositories/enrollmentRepo';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const data = await getEnrollmentById(params.id);
        if (!data) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

        return NextResponse.json(data);
    } catch (error) {
        logger.error('[Enrollments]', 'GET by ID failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { enrollmentItemId, hoursToAdd } = body;

        if (!enrollmentItemId || hoursToAdd === undefined) {
            return NextResponse.json({ error: 'enrollmentItemId and hoursToAdd are required' }, { status: 400 });
        }

        const result = await updateEnrollmentItemHours(enrollmentItemId, hoursToAdd);
        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Enrollments]', 'PATCH failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
