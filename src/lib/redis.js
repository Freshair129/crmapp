import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisCache {
    constructor() {
        // Promise sharing map — ป้องกัน Cache Stampede
        // ถ้า 2 requests ขอ key เดียวกันพร้อมกัน, request ที่ 2 จะรอ promise ของ request แรก
        this._inflight = new Map();

        this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.client.on('error', (err) => {
            logger.error('[Redis]', 'Connection error', err);
        });

        this.client.on('connect', () => {
            logger.info('[Redis]', 'Connected successfully');
        });
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('[Redis]', `GET failed for ${key}`, error);
            return null;
        }
    }

    async set(key, value, ttlSeconds = 300) {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            return true;
        } catch (error) {
            logger.error('[Redis]', `SET failed for ${key}`, error);
            return false;
        }
    }

    /**
     * Get or Set pattern with Promise sharing (anti-stampede)
     * ถ้า 2 requests ขอ key เดียวกันพร้อมกัน → share promise เดียว → DB query แค่ 1 ครั้ง
     */
    async getOrSet(key, fetcher, ttlSeconds = 300) {
        const cached = await this.get(key);
        if (cached !== null) {
            logger.info('[Redis]', `Cache HIT: ${key}`);
            return cached;
        }

        // ถ้ามี request อื่นกำลัง fetch อยู่แล้ว → รอ promise เดิม
        if (this._inflight.has(key)) {
            logger.info('[Redis]', `Cache MISS (shared): ${key}`);
            return this._inflight.get(key);
        }

        logger.info('[Redis]', `Cache MISS: ${key}. Fetching fresh data...`);
        const promise = fetcher()
            .then(async freshData => {
                await this.set(key, freshData, ttlSeconds);
                this._inflight.delete(key);
                return freshData;
            })
            .catch(err => {
                this._inflight.delete(key);
                throw err;
            });

        this._inflight.set(key, promise);
        return promise;
    }

    async del(key) {
        return this.client.del(key);
    }
}

export const cache = new RedisCache();
export default cache;
