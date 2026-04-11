import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock('web-push', () => ({
    default: {
        setVapidDetails: mockSetVapidDetails,
        sendNotification: mockSendNotification,
    },
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
}));

vi.mock('@/lib/prisma', () => ({
    getPrisma: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';

describe('pushNotifier', () => {
    let mockPrisma;
    let notifyInbox;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockPrisma = {
            pushSubscription: {
                findMany: vi.fn(),
                deleteMany: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
        // Dynamic import to allow mocks to set up first
        const mod = await import('@/lib/pushNotifier');
        notifyInbox = mod.notifyInbox;
    });

    it('should do nothing when no subscriptions', async () => {
        mockPrisma.pushSubscription.findMany.mockResolvedValue([]);
        await notifyInbox({ title: 'Test', body: 'Body' });
        expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should send push to all subscriptions', async () => {
        const subs = [
            { id: 's1', endpoint: 'https://push1.example.com', p256dh: 'key1', auth: 'auth1' },
            { id: 's2', endpoint: 'https://push2.example.com', p256dh: 'key2', auth: 'auth2' },
        ];
        mockPrisma.pushSubscription.findMany.mockResolvedValue(subs);
        mockSendNotification.mockResolvedValue({});

        await notifyInbox({ title: 'New Message', body: 'Hello', conversationId: 'conv-1' });

        expect(mockSendNotification).toHaveBeenCalledTimes(2);
        const message = JSON.parse(mockSendNotification.mock.calls[0][1]);
        expect(message.title).toBe('New Message');
        expect(message.body).toBe('Hello');
        expect(message.conversationId).toBe('conv-1');
    });

    it('should cleanup expired subscriptions (410 Gone)', async () => {
        const subs = [
            { id: 's1', endpoint: 'https://push1.example.com', p256dh: 'k1', auth: 'a1' },
            { id: 's2', endpoint: 'https://push2.example.com', p256dh: 'k2', auth: 'a2' },
        ];
        mockPrisma.pushSubscription.findMany.mockResolvedValue(subs);
        mockSendNotification
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce({ statusCode: 410 });
        mockPrisma.pushSubscription.deleteMany.mockResolvedValue({});

        await notifyInbox({ title: 'Test' });

        expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ['s2'] } },
        });
    });

    it('should use default values for missing payload fields', async () => {
        const subs = [{ id: 's1', endpoint: 'https://push.example.com', p256dh: 'k', auth: 'a' }];
        mockPrisma.pushSubscription.findMany.mockResolvedValue(subs);
        mockSendNotification.mockResolvedValue({});

        await notifyInbox({});

        const message = JSON.parse(mockSendNotification.mock.calls[0][1]);
        expect(message.title).toContain('The V School');
        expect(message.tag).toBe('inbox-message');
        expect(message.icon).toBe('/icon-192.png');
    });

    it('should handle DB error when fetching subscriptions', async () => {
        mockPrisma.pushSubscription.findMany.mockRejectedValue(new Error('DB'));
        await notifyInbox({ title: 'Test' });
        expect(mockSendNotification).not.toHaveBeenCalled();
    });
});
