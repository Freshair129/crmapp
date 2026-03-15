import { NextResponse } from 'next/server';
import { addCourseMenu, removeCourseMenu } from '@/lib/repositories/courseRepo';

// POST /api/courses/[id]/menus — add a recipe to this course
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { recipeId, dayNumber, sessionSlot, sortOrder } = body;
        if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 });
        const menu = await addCourseMenu(params.id, { recipeId, dayNumber, sessionSlot, sortOrder });
        return NextResponse.json(menu, { status: 201 });
    } catch (error) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Recipe already in this course' }, { status: 409 });
        }
        console.error('[CoursesAPI] POST menus error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/courses/[id]/menus?menuId=xxx — remove a CourseMenu entry
export async function DELETE(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const menuId = searchParams.get('menuId');
        if (!menuId) return NextResponse.json({ error: 'menuId required' }, { status: 400 });
        await removeCourseMenu(menuId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[CoursesAPI] DELETE menus error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
