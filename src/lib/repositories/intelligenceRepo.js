import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODULE = 'IntelligenceRepo';

/**
 * ดึงข้อมูลวิเคราะห์ล่าสุดของบทสนทนา
 */
export async function getLatestAnalysis(conversationId) {
    try {
        const prisma = await getPrisma();
        return prisma.conversationIntelligence.findFirst({
            where: { conversationId },
            orderBy: { date: 'desc' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get analysis', error);
        throw error;
    }
}

/**
 * Generate NotebookLM-style summary + Mermaid Knowledge Tree
 */
export async function generateChatAnalysis(conversationId) {
    try {
        const prisma = await getPrisma();

        // 1. ดึงประวัติแชทล่าสุด (50 ข้อความ)
        const messages = await prisma.message.findMany({
            where: { conversation: { id: conversationId } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        if (messages.length === 0) return null;

        const chatContext = messages
            .reverse()
            .map((m) => `${m.senderType === 'CUSTOMER' ? '👤 Customer' : '💬 Admin'}: ${m.content}`)
            .join('\n');

        // 2. เรียก Gemini 2.0
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        const prompt = `
Analyze the following chat history from a cooking school CRM.
Generate a "NotebookLM-style" intelligence report including:
1. A concise summary of the conversation.
2. Key takeaways (array of strings).
3. Sentiment (POSITIVE, NEUTRAL, NEGATIVE).
4. Intent (SALES, SUPPORT, INQUIRY).
5. A Mermaid.js "graph TD" tree diagram code that represents the "Knowledge Tree" of this customer's interests and questions.

Chat History:
${chatContext}

Return strictly as JSON:
{
  "summary": "...",
  "keyTakeaways": ["...", "..."],
  "sentiment": "...",
  "intent": "...",
  "treeCode": "graph TD\\n  A[Customer Name] --> B(...) ..."
}
`;

        const result = await model.generateContent(prompt);
        const analysis = JSON.parse(result.response.text());

        // 3. บันทึกลง Database
        return prisma.conversationIntelligence.create({
            data: {
                conversationId,
                summary: analysis.summary,
                keyTakeaways: analysis.keyTakeaways,
                sentiment: analysis.sentiment,
                intent: analysis.intent,
                treeCode: analysis.treeCode,
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to generate analysis', error);
        throw error;
    }
}
