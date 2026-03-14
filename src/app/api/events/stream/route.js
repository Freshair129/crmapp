import { logger } from '@/lib/logger';
import { eventBus } from '@/lib/eventBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Real-time SSE Stream
 * Broadcasts chat-updates events to connected clients via Node.js EventEmitter.
 */
export async function GET() {
    const encoder = new TextEncoder();

    let heartbeatTimer;
    let onChatUpdate;

    const stream = new ReadableStream({
        start(controller) {
            logger.info('SSE', 'Client connected to event stream');

            // Send initial connection event
            controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
            ));

            // Heartbeat every 15 seconds to keep connection alive
            heartbeatTimer = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch {
                    logger.warn('SSE', 'Heartbeat failed — client disconnected');
                    clearInterval(heartbeatTimer);
                    eventBus.off('chat-update', onChatUpdate);
                }
            }, 15000);

            // Subscribe to webhook events → push to this client
            onChatUpdate = (payload) => {
                try {
                    controller.enqueue(encoder.encode(
                        `data: ${JSON.stringify({ channel: 'chat-updates', data: payload })}\n\n`
                    ));
                } catch {
                    // Client disconnected mid-push — clean up
                    eventBus.off('chat-update', onChatUpdate);
                    clearInterval(heartbeatTimer);
                }
            };
            eventBus.on('chat-update', onChatUpdate);
        },
        cancel() {
            logger.info('SSE', 'Client disconnected from event stream');
            clearInterval(heartbeatTimer);
            eventBus.off('chat-update', onChatUpdate);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable Nginx buffering
        },
    });
}
