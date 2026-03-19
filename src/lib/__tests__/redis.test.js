import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cache } from '../redis';
import { logger } from '../logger';

vi.mock('../logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('RedisCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock @upstash/redis client
        cache.client = {
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
            incr: vi.fn(),
            expire: vi.fn(),
        };
    });

    describe('get', () => {
        it('should return parsed JSON', async () => {
            cache.client.get.mockResolvedValue(JSON.stringify({ a: 1 }));
            const result = await cache.get('test');
            expect(result).toEqual({ a: 1 });
        });

        it('should return null if not found', async () => {
            cache.client.get.mockResolvedValue(null);
            const result = await cache.get('test');
            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should call client.set with JSON string and TTL options', async () => {
            await cache.set('test', { b: 2 }, 100);
            expect(cache.client.set).toHaveBeenCalledWith(
                'test',
                JSON.stringify({ b: 2 }),
                { ex: 100 }
            );
        });
    });

    describe('incr', () => {
        it('should increment a key', async () => {
            cache.client.incr.mockResolvedValue(1);
            const result = await cache.incr('counter');
            expect(result).toBe(1);
            expect(cache.client.incr).toHaveBeenCalledWith('counter');
        });

        it('should log error and return null on failure', async () => {
            cache.client.incr.mockRejectedValue(new Error('fail'));
            const result = await cache.incr('counter');
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('expire', () => {
        it('should set expiration on a key', async () => {
            cache.client.expire.mockResolvedValue(1);
            const result = await cache.expire('key', 60);
            expect(result).toBe(1);
            expect(cache.client.expire).toHaveBeenCalledWith('key', 60);
        });
    });
});
