import { Receiver } from '@upstash/qstash';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { pushMessage } from '@/lib/lineService';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function POST(request) {
  const signature = request.headers.get('upstash-signature');
  const body = await request.text();

  // 1. Verify QStash Signature
  const isValid = await receiver.verify({
    signature: signature || '',
    body,
  }).catch(err => {
    logger.error('[NotificationWorker]', 'Signature verification failed with error', err);
    return false;
  });

  if (!isValid) {
    logger.warn('[NotificationWorker]', 'Invalid QStash signature');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Process Notification
  try {
    const { ruleId, actions, context } = JSON.parse(body);
    logger.info('[NotificationWorker]', `Processing notification for rule ${ruleId}`);

    // Handle LINE Notification
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

    // 3. Handle other actions (Future: Email, Task Creation, etc.)
    if (actions.createTask) {
        // ... task logic
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[NotificationWorker]', 'Processing failed', error);
    // Return 500 to trigger QStash retry
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
