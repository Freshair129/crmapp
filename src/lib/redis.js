import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisCache {
    constructor() {
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
     * Get or Set pattern for expensive queries
     */
    async getOrSet(key, fetcher, ttlSeconds = 300) {
        const cached = await this.get(key);
        if (cached !== null) {
            logger.info('[Redis]', `Cache HIT: ${key}`);
            return cached;
        }

        logger.info('[Redis]', `Cache MISS: ${key}. Fetching fresh data...`);
        const freshData = await fetcher();
        await this.set(key, freshData, ttlSeconds);
        return freshData;
    }

    async del(key) {
        return this.client.del(key);
    }
}

export const cache = new RedisCache();
export default cache;
