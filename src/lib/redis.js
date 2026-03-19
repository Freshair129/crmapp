import { Redis } from '@upstash/redis';
import { logger } from './logger';

class RedisCache {
    constructor() {
        // Promise sharing map — เพื่อป้องกัน Cache Stampede ในสภาพแวดล้อม Serverless
        this._inflight = new Map();

        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!url || !token) {
            logger.error('[Redis]', 'Upstash Redis environment variables are missing');
        }

        this.client = new Redis({
            url: url || '',
            token: token || '',
        });
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            if (!data) return null;
            
            // @upstash/redis returns parsed JSON if the data was stored as JSON
            // and strings for everything else. No need for manual JSON.parse if ioredis compatibility is required.
            // But to be safe and maintain ioredis behavior (which stores everything as strings):
            if (typeof data === 'object') return data;
            
            try {
                return JSON.parse(data);
            } catch (parseError) {
                // If it's not JSON, return it as is (string)
                return data;
            }
        } catch (error) {
            logger.error('[Redis]', `GET failed for ${key}`, error);
            return null;
        }
    }

    async set(key, value, ttlSeconds = 300) {
        try {
            await this.client.set(key, JSON.stringify(value), { ex: ttlSeconds });
            return true;
        } catch (error) {
            logger.error('[Redis]', `SET failed for ${key}`, error);
            return false;
        }
    }

    /**
     * Get or Set pattern with Promise sharing (anti-stampede)
     */
    static NULL_SENTINEL = '__NULL__';

    async getOrSet(key, fetcher, ttlSeconds = 300) {
        const cached = await this.get(key);
        
        if (cached === RedisCache.NULL_SENTINEL) {
            logger.info('[Redis]', `Cache HIT (negative): ${key}`);
            return null;
        }
        if (cached !== null) {
            logger.info('[Redis]', `Cache HIT: ${key}`);
            return cached;
        }

        if (this._inflight.has(key)) {
            logger.info('[Redis]', `Cache MISS (shared): ${key}`);
            return this._inflight.get(key);
        }

        logger.info('[Redis]', `Cache MISS: ${key}. Fetching fresh data...`);
        
        const timeoutId = setTimeout(() => {
            if (this._inflight.has(key)) {
                this._inflight.delete(key);
                logger.warn('[Redis]', `_inflight timeout for key ${key}`);
            }
        }, 30_000);

        const promise = fetcher()
            .then(async freshData => {
                clearTimeout(timeoutId);
                await this.set(key, freshData, ttlSeconds);
                this._inflight.delete(key);
                return freshData;
            })
            .catch(async err => {
                clearTimeout(timeoutId);
                this._inflight.delete(key);
                await this.set(key, RedisCache.NULL_SENTINEL, 30).catch(() => {});
                throw err;
            });

        this._inflight.set(key, promise);
        return promise;
    }

    async del(key) {
        try {
            return await this.client.del(key);
        } catch (error) {
            logger.error('[Redis]', `DEL failed for ${key}`, error);
            return 0;
        }
    }

    async incr(key) {
        try {
            return await this.client.incr(key);
        } catch (error) {
            logger.error('[Redis]', `INCR failed for ${key}`, error);
            return null;
        }
    }

    async expire(key, seconds) {
        try {
            return await this.client.expire(key, seconds);
        } catch (error) {
            logger.error('[Redis]', `EXPIRE failed for ${key}`, error);
            return false;
        }
    }
}

export const cache = new RedisCache();
export default cache;
