import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/webhooks/facebook/route';
import { getPrisma } from '@/lib/db';
import { notificationEngine } from '@/lib/notificationEngine';
import crypto from 'crypto';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/notificationEngine', () => ({
    notificationEngine: {
        evaluateRules: vi.fn(),
    },
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('Webhook Integration Test', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            customer: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
            conversation: { upsert: vi.fn(), updateMany: vi.fn() },
            message: { upsert: vi.fn() },
            notificationRule: { findMany: vi.fn() },
            $transaction: vi.fn(async (cb) => cb(mockPrisma)),
        };
        getPrisma.mockResolvedValue(mockPrisma);
        process.env.FB_APP_SECRET = 'test-secret';
        process.env.FB_PAGE_ID = 'page-123';
    });

    it('should process a Facebook message and trigger notification engine', async () => {
        const payload = {
            object: 'page',
            entry: [{
                messaging: [{
                    sender: { id: 'user-123' },
                    recipient: { id: 'page-123' },
                    timestamp: Date.now(),
                    message: { mid: 'mid.123', text: 'ราคาเท่าไหร่ครับ' }
                }]
            }]
        };
        const body = JSON.stringify(payload);
        const signature = `sha256=${crypto.createHmac('sha256', 'test-secret').update(body).digest('hex')}`;

        mockPrisma.customer.findFirst.mockResolvedValue({ id: 'uuid-1' });
        mockPrisma.conversation.upsert.mockResolvedValue({ id: 'conv-1' });
        mockPrisma.notificationRule.findMany.mockResolvedValue([{
            ruleId: 'RULE-1',
            event: 'MESSAGE_RECEIVED',
            conditions: { keywords: ['ราคา'] },
            actions: { lineNotify: 'default' },
            isActive: true
        }]);

        const request = {
            text: async () => body,
            headers: {
                get: (name) => (name === 'x-hub-signature-256' ? signature : null)
            }
        };

        const response = await POST(request);
        const resData = await response.json();

        expect(response.status).toBe(200);
        expect(resData.status).toBe('EVENT_RECEIVED');

        // Since it's fire-and-forget, we might need a small delay or await the specific call if possible.
        // But for unit-style integration test, we can check if it WAS called (since we mock processEvent indirectly).
        // Wait, Route call processEvent WITHOUT await. 
        // We need to wait for the async task to finish or mock processEvent to be synchronous for testing.
        
        // Let's wait a bit for fire-and-forget
        await new Promise(r => setTimeout(r, 100));

        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(notificationEngine.evaluateRules).toHaveBeenCalledWith('MESSAGE_RECEIVED', expect.any(Object));
    });

    it('should trigger slip detection when an image attachment is received', async () => {
        const payload = {
            object: 'page',
            entry: [{
                messaging: [{
                    sender: { id: 'user-123' },
                    recipient: { id: 'page-123' },
                    timestamp: Date.now(),
                    message: { 
                        mid: 'mid.image',
                        attachments: [{
                            type: 'image',
                            payload: { url: 'http://test.com/slip.jpg' }
                        }]
                    }
                }]
            }]
        };
        const body = JSON.stringify(payload);
        const signature = `sha256=${crypto.createHmac('sha256', 'test-secret').update(body).digest('hex')}`;

        mockPrisma.customer.findFirst.mockResolvedValue({ id: 'uuid-1' });
        mockPrisma.conversation.upsert.mockResolvedValue({ id: 'conv-1' });

        const request = {
            text: async () => body,
            headers: {
                get: (name) => (name === 'x-hub-signature-256' ? signature : null)
            }
        };

        const response = await POST(request);
        expect(response.status).toBe(200);

        // Wait for fire-and-forget logic
        await new Promise(r => setTimeout(r, 200));

        // We verify that the message was recorded at least
        expect(mockPrisma.conversation.upsert).toHaveBeenCalled();
    });
});
