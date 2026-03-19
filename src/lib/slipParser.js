import { logger } from "@/lib/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    logger.error('SlipParser', 'GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * @typedef {Object} SlipResult
 * @property {boolean} isSlip
 * @property {number} confidence
 * @property {number | null} amount
 * @property {string | null} date - ISO 8601
 * @property {string | null} refNumber
 * @property {string | null} bankName
 * @property {string | null} rawText
 */

/**
 * Downloads an image from the given URL and converts it to a base64 string suitable for Gemini payload.
 */
async function fetchImageAsGenerativePart(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch image from URL: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType
        }
    };
}

/**
 * Parses a bank slip image using Gemini 2.0 Flash.
 * 
 * @param {string} imageUrl 
 * @returns {Promise<SlipResult>}
 */
export async function parseSlip(imageUrl) {
    if (!apiKey) {
         throw new Error('SlipParser: GEMINI_API_KEY missing');
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const imagePart = await fetchImageAsGenerativePart(imageUrl);

        const prompt = `
            Analyze this image to determine if it is a Thai bank transfer slip.
            Extract the following information and return it strictly as JSON.
            Required fields:
            - "isSlip": boolean, true if it's clearly a bank transfer slip.
            - "confidence": number between 0.0 and 1.0 representing how confident you are that this is a valid slip.
            - "amount": number, the transfer amount in THB (null if not found).
            - "date": string, the transfer date in ISO 8601 format (null if not found).
            - "refNumber": string, the transaction reference number (null if not found).
            - "bankName": string, the name of the sender's bank or recipient's bank if sender is unclear (null if not found).
            - "rawText": string, extract key text lines found in the slip for auditing purposes (null if empty).
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // Parse the JSON response
        const parsed = JSON.parse(responseText);

        // Enforce confidence threshold
        const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
        const isSlip = parsed.isSlip === true && confidence >= 0.80;

        return {
            isSlip: isSlip,
            confidence: confidence,
            amount: typeof parsed.amount === 'number' ? parsed.amount : null,
            date: parsed.date || null,
            refNumber: parsed.refNumber || null,
            bankName: parsed.bankName || null,
            rawText: parsed.rawText || null
        };

    } catch (error) {
        logger.error('SlipParser', 'Gemini OCR failed', error);
        throw error; // Let QStash retry handle it
    }
}
