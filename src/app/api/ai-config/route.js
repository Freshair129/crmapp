import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAllAIConfig, setMultipleAIConfig } from '@/lib/repositories/aiConfigRepo';

/** GET /api/ai-config — return all AI config values */
export async function GET() {
    try {
        const config = await getAllAIConfig();
        return NextResponse.json({ success: true, config });
    } catch (err) {
        logger.error('[AIConfig]', 'GET error', err);
        return NextResponse.json({ success: false, error: 'Failed to load config' }, { status: 500 });
    }
}

/** POST /api/ai-config — save one or more config values
 *  Body: { persona?, knowledge?, tone_friendly?, tone_formal?, tone_sales? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const allowed = ['persona', 'knowledge', 'tone_friendly', 'tone_formal', 'tone_sales'];
        const updates = Object.fromEntries(
            Object.entries(body).filter(([k, v]) => allowed.includes(k) && typeof v === 'string')
        );
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No valid fields provided' }, { status: 400 });
        }
        await setMultipleAIConfig(updates);
        return NextResponse.json({ success: true });
    } catch (err) {
        logger.error('[AIConfig]', 'POST error', err);
        return NextResponse.json({ success: false, error: 'Failed to save config' }, { status: 500 });
    }
}
