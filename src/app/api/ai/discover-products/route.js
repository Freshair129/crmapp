import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GET /api/ai/discover-products?customerId={fbConversationId}
 * Analyzes conversation messages to discover products of interest + suggest agent.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('customerId');

        if (!conversationId) {
            return NextResponse.json({ success: false, error: 'customerId is required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        // Resolve FB conversation ID → internal UUID
        const conv = await prisma.conversation.findUnique({ where: { conversationId } });
        if (!conv) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Get last 30 messages
        const messages = await prisma.message.findMany({
            where: { conversationId: conv.id },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });

        if (!messages.length) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Load existing products for context
        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { name: true, category: true, price: true },
        });

        const messageText = messages
            .reverse()
            .map((m) => `${m.fromName || 'Customer'}: ${m.content || ''}`)
            .join('\n');

        const productList = products.map((p) => `${p.name} (${p.category}, ฿${p.price})`).join(', ');

        const prompt = `You are a product intelligence assistant for The V School, a Japanese cooking school in Bangkok.

Conversation:
${messageText}

Available products: ${productList || 'None yet'}

Tasks:
1. Identify any products the customer expressed interest in (by name or description).
2. For each discovered product, check if it matches an existing product (exists: true/false).
3. If the customer shows strong interest in a specific area (e.g. private lessons, group class), suggest the best agent role.

Respond ONLY with valid JSON:
{
  "products": [
    { "product_name": "...", "price": 0, "category": "course|package|other", "exists": false }
  ],
  "suggested_agent": "Agent Name or null",
  "justification": "brief reason or null"
}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();

        // Parse JSON from response (strip markdown fences if present)
        const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            console.error('[DiscoverProducts] Failed to parse Gemini response', raw);
            return NextResponse.json({ success: true, data: [] });
        }

        return NextResponse.json({
            success: true,
            data: parsed.products || [],
            suggested_agent: parsed.suggested_agent || null,
            justification: parsed.justification || null,
        });
    } catch (error) {
        console.error('[DiscoverProducts] GET error', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/ai/discover-products
 * Body: { product_name, price, category }
 * Adds a newly discovered product to the catalog.
 */
export async function POST(request) {
    try {
        const { product_name, price, category } = await request.json();

        if (!product_name || price == null) {
            return NextResponse.json({ success: false, error: 'product_name and price are required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        const productId = `TVS-AI-${Date.now().toString(36).toUpperCase()}`;

        await prisma.product.create({
            data: {
                productId,
                name: product_name,
                price: parseFloat(price) || 0,
                category: category || 'course',
                isActive: true,
            },
        });

        return NextResponse.json({ success: true, productId });
    } catch (error) {
        console.error('[DiscoverProducts] POST error', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
