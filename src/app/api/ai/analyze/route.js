import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GET /api/ai/analyze
 * Aggregates key business metrics and generates an AI summary.
 * Returns: { success, data: { metrics, insights, recommendations } }
 */
export async function GET() {
    try {
        const prisma = await getPrisma();

        // Gather metrics in parallel
        const [
            totalCustomers,
            totalOrders,
            activeAds,
            recentOrders,
        ] = await Promise.all([
            prisma.customer.count(),
            prisma.order.count(),
            prisma.ad.count({ where: { status: 'ACTIVE' } }),
            prisma.order.findMany({
                take: 20,
                orderBy: { date: 'desc' },
                select: { totalAmount: true, status: true, date: true },
            }),
        ]);

        const totalRevenue = recentOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        const avgOrderValue = recentOrders.length > 0 ? totalRevenue / recentOrders.length : 0;

        const metrics = {
            totalCustomers,
            totalOrders,
            activeAds,
            recentRevenue: totalRevenue,
            avgOrderValue: Math.round(avgOrderValue),
        };

        // Generate AI summary
        let insights = null;
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `Analyze these V School CRM metrics and provide 3 actionable insights in Thai:
- Total customers: ${totalCustomers}
- Total orders: ${totalOrders}
- Active ads: ${activeAds}
- Recent 20 orders revenue: ฿${totalRevenue.toLocaleString()}
- Average order value: ฿${Math.round(avgOrderValue).toLocaleString()}

Format: JSON with keys { summary: string, insights: string[], recommendations: string[] }`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
            insights = JSON.parse(text);
        } catch (aiErr) {
            logger.error('[AIAnalyze]', 'Gemini error', aiErr);
            insights = {
                summary: 'ไม่สามารถวิเคราะห์ได้ชั่วคราว',
                insights: [],
                recommendations: [],
            };
        }

        return NextResponse.json({
            success: true,
            data: { metrics, ...insights },
        });
    } catch (error) {
        logger.error('[AIAnalyze]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
