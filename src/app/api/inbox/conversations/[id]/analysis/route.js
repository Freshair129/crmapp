import { getLatestAnalysis, generateChatAnalysis } from '@/lib/repositories/intelligenceRepo';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
    try {
        const { id } = params;
        const data = await getLatestAnalysis(id);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('[Analysis:GET] failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const { id } = params;
        const data = await generateChatAnalysis(id);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('[Analysis:POST] failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
