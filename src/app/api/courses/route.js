import { NextResponse } from 'next/server';
import { listCourses, createCourse } from '@/lib/repositories/courseRepo';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const isActive = searchParams.has('isActive') ? searchParams.get('isActive') === 'true' : undefined;
        const courses = await listCourses({ isActive });
        return NextResponse.json(courses);
    } catch (error) {
        console.error('[CoursesAPI] GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, description, price, hours, days, sessionType, instructorIds, menus } = body;
        if (!name || price === undefined) {
            return NextResponse.json({ error: 'name and price are required' }, { status: 400 });
        }
        const course = await createCourse({ name, description, price, hours, days, sessionType, instructorIds, menus });
        return NextResponse.json(course, { status: 201 });
    } catch (error) {
        console.error('[CoursesAPI] POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
