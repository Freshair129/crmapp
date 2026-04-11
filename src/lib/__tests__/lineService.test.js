import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushMessage, sendLineAlert } from '@/lib/lineService';

vi.mock('@/lib/identityService.js', () => ({
    resolveOrCreateCustomer: vi.fn(),
}));

vi.mock('@/lib/redis.js', () => ({
    cache: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

import { cache } from '@/lib/redis.js';

describe('lineService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', 'test-token');
        vi.stubEnv('LINE_GROUP_ID', 'group-123');
    });

    describe('pushMessage', () => {
        it('should return false when no token', async () => {
            vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', '');
            const result = await pushMessage('user-1', [{ type: 'text', text: 'hi' }]);
            expect(result).toBe(false);
        });

        it('should return false when no recipient', async () => {
            const result = await pushMessage(null, [{ type: 'text', text: 'hi' }]);
            expect(result).toBe(false);
        });

        it('should return false when quota exceeded (circuit breaker)', async () => {
            cache.get.mockResolvedValue(true);
            const result = await pushMessage('user-1', [{ type: 'text', text: 'hi' }]);
            expect(result).toBe(false);
        });

        it('should send message successfully', async () => {
            cache.get.mockResolvedValue(null);
            global.fetch = vi.fn().mockResolvedValue({ ok: true });

            const result = await pushMessage('user-1', [{ type: 'text', text: 'hello' }]);

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/push',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ to: 'user-1', messages: [{ type: 'text', text: 'hello' }] }),
                })
            );
        });

        it('should set quota cache on 402 response', async () => {
            cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // first for circuit check, second inside error handler
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 402,
                json: () => Promise.resolve({ message: 'monthly limit' }),
            });

            const result = await pushMessage('user-1', [{ type: 'text', text: 'hi' }]);

            expect(result).toBe(false);
            expect(cache.set).toHaveBeenCalledWith('line:quota_exceeded', true, 86400);
        });

        it('should return false on fetch error', async () => {
            cache.get.mockResolvedValue(null);
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await pushMessage('user-1', [{ type: 'text', text: 'hi' }]);
            expect(result).toBe(false);
        });
    });

    describe('sendLineAlert', () => {
        it('should return false when no LINE_GROUP_ID', async () => {
            vi.stubEnv('LINE_GROUP_ID', '');
            const result = await sendLineAlert('test');
            expect(result).toBe(false);
        });

        it('should call pushMessage with group ID and text message', async () => {
            cache.get.mockResolvedValue(null);
            global.fetch = vi.fn().mockResolvedValue({ ok: true });

            const result = await sendLineAlert('Alert message');

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/push',
                expect.objectContaining({
                    body: JSON.stringify({
                        to: 'group-123',
                        messages: [{ type: 'text', text: 'Alert message' }],
                    }),
                })
            );
        });
    });
});
