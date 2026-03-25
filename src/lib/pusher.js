import Pusher from 'pusher';

let _pusher;

export function getPusher() {
    if (!_pusher) {
        _pusher = new Pusher({
            appId:   process.env.PUSHER_APP_ID,
            key:     process.env.NEXT_PUBLIC_PUSHER_KEY,
            secret:  process.env.PUSHER_SECRET,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            useTLS:  true,
        });
    }
    return _pusher;
}

/**
 * Trigger a chat-update event so all open inbox clients refresh.
 * @param {string} conversationId  e.g. "t_123456"
 */
export async function triggerChatUpdate(conversationId) {
    const pusher = getPusher();
    await pusher.trigger('inbox', 'chat-update', { conversationId });
}
