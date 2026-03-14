import 'dotenv/config';
import { Worker } from 'bullmq';
import { pushMessage } from '../lib/lineService.js';
import { logger } from '../lib/logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connectionOpts = {
  host: new URL(redisUrl).hostname,
  port: parseInt(new URL(redisUrl).port || '6379'),
  maxRetriesPerRequest: null,
};

logger.info('[NotificationWorker]', 'Worker starting...');

const worker = new Worker('notifications', async (job) => {
  const { ruleId, actions, context } = job.data;
  
  logger.info('[NotificationWorker]', `Processing job ${job.id} for rule ${ruleId}`);

  try {
    // 1. Handle LINE Notification
    if (actions.lineNotify) {
      const target = actions.lineNotify === 'default' ? process.env.LINE_GROUP_ID : actions.lineNotify;
      const messageText = actions.message || `Notification from Rule ${ruleId}`;
      
      // Basic template replacement
      const finalMessage = messageText
        .replace('{content}', context.message?.content || '')
        .replace('{channel}', context.channel || '');

      await pushMessage(target, [{ type: 'text', text: finalMessage }]);
      logger.info('[NotificationWorker]', `Sent LINE notification to ${target}`);
    }

    // 2. Handle other actions (Future: Email, Task Creation, etc.)
    if (actions.createTask) {
        // ... task logic
    }

    return { success: true };
  } catch (error) {
    logger.error('[NotificationWorker]', `Job ${job.id} failed`, error);
    throw error; // Re-throw to trigger BullMQ retry
  }
}, { 
  connection: connectionOpts,
  concurrency: 5
});

worker.on('completed', (job) => {
  logger.info('[NotificationWorker]', `Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error('[NotificationWorker]', `Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`);
});

process.on('SIGTERM', async () => {
    logger.info('[NotificationWorker]', 'SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
});
