import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are V-Insight, a business intelligence assistant for The V School — a Japanese cooking school in Bangkok.
You help analyze CRM data, marketing metrics, customer behavior, and business performance.
Answer concisely in the same language as the user (Thai or English). Be direct and actionable.`;

/**
 * POST /api/ai/chat
 * Body: { question: string, history: [{ role: 'user'|'assistant', content: string }] }
 * Returns: { success, answer }
 */
export async function POST(request) {
    try {
        const { question, history = [] } = await request.json();

        if (!question?.trim()) {
            return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Build chat history for context
        const chatHistory = history.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Understood. I am V-Insight, ready to help analyze The V School business data.' }] },
                ...chatHistory,
            ],
        });

        const result = await chat.sendMessage(question);
        const answer = result.response.text();

        return NextResponse.json({ success: true, answer });
    } catch (error) {
        logger.error('[AIChat]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'AI service error' }, { status: 500 });
    }
}
