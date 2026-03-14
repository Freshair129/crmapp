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

        const totalRevenue = recentOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
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
            const model = genAI.getGenerativeModel({ 
                model: 'gemini-1.5-flash',
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });
            const prompt = `Analyze these V School CRM metrics (Japanese cooking school, Bangkok):
- Total customers: ${totalCustomers}
- Total orders: ${totalOrders}
- Active ads: ${activeAds}
- Recent orders revenue: ฿${totalRevenue.toLocaleString()}
- Average order value: ฿${Math.round(avgOrderValue).toLocaleString()}

Return a JSON object with this exact structure:
{
  "executiveSummary": {
    "healthScore": 85,
    "sentiment": "Positive",
    "keyMetric": "฿45,000"
  },
  "opportunities": [
    { "score": "A", "type": "upsell", "message": "Thai insight", "action": "Thai CTA" }
  ],
  "risks": [
    { "type": "churn", "message": "Thai warning" }
  ]
}
Provide 2-3 opportunities and 1-2 risks. Write message/action fields in Thai.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            
            // Clean markdown fences if Gemini still returns them despite responseMimeType
            const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
            insights = JSON.parse(cleanedText);
        } catch (aiErr) {
            logger.error('[AIAnalyze]', 'Gemini error', aiErr);
            insights = {
                executiveSummary: {
                    healthScore: totalOrders > 0 ? Math.min(100, Math.round((totalCustomers / 10) + (totalOrders * 2))) : 40,
                    sentiment: totalOrders > 5 ? 'Positive' : 'Neutral',
                    keyMetric: `฿${totalRevenue.toLocaleString()}`,
                },
                opportunities: [
                    { score: 'A', type: 'ลูกค้า', message: `มีลูกค้าทั้งหมด ${totalCustomers} ราย`, action: 'ติดตาม' },
                ],
                risks: [],
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
