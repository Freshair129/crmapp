import { logger } from '@/lib/logger';

/**
 * Real-time SSE Stream (Phase 1 Foundation)
 * Provides heartbeats and event broadcasting to connected clients.
 */
export async function GET() {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            logger.info('SSE', 'Client connected to event stream');

            // Send initial connection event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`));

            // Heartbeat every 15 seconds to keep connection alive
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch (err) {
                    logger.warn('SSE', 'Failed to send heartbeat, client likely disconnected');
                    clearInterval(heartbeat);
                }
            }, 15000);

            // TODO: In Phase 4/5, integrate with a Redis/EventEmitter for real-time broadcasts
        },
        cancel() {
            logger.info('SSE', 'Client disconnected from event stream');
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
