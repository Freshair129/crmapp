import { NextResponse } from 'next/server';
import { getCourse, updateCourse } from '@/lib/repositories/courseRepo';

export async function GET(request, { params }) {
    try {
        const course = await getCourse(params.id);
        if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(course);
    } catch (error) {
        console.error('[CoursesAPI] GET[id] error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const body = await request.json();
        const course = await updateCourse(params.id, body);
        return NextResponse.json(course);
    } catch (error) {
        console.error('[CoursesAPI] PATCH error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
