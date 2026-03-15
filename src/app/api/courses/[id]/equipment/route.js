import { NextResponse } from 'next/server';
import { addCourseEquipment, removeCourseEquipment } from '@/lib/repositories/courseRepo';

// POST /api/courses/[id]/equipment
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { name, qty, isIncluded, estimatedCost, notes } = body;
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
        const eq = await addCourseEquipment(params.id, { name, qty, isIncluded, estimatedCost, notes });
        return NextResponse.json(eq, { status: 201 });
    } catch (error) {
        console.error('[CoursesAPI] POST equipment error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/courses/[id]/equipment?equipmentId=xxx
export async function DELETE(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const equipmentId = searchParams.get('equipmentId');
        if (!equipmentId) return NextResponse.json({ error: 'equipmentId required' }, { status: 400 });
        await removeCourseEquipment(equipmentId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[CoursesAPI] DELETE equipment error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
