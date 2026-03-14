import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared connection for BullMQ
const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
});

connection.on('error', (err) => {
    logger.error('[QueueRedis]', 'Connection error', err);
});

// Define Queues
export const notificationQueue = new Queue('notifications', { 
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

logger.info('[Queue]', 'Notification Queue initialized');

export default {
    notificationQueue,
    connection,
};
