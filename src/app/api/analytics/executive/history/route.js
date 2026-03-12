import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { analyticsRepository } from '@/lib/repositories/analyticsRepository';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        
        const data = await analyticsRepository.getRevenueHistory(days);
        
        return NextResponse.json(data);
    } catch (error) {
        logger.error('[ExecutiveHistoryAPI]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
