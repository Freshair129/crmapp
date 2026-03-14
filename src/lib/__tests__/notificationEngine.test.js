import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationEngine } from '../notificationEngine';
import { notificationQueue } from '../queue';

// Mock BullMQ queue
vi.mock('../queue', () => ({
  notificationQueue: {
    add: vi.fn(),
  },
}));

describe('NotificationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContext = {
    message: { content: 'สอบถามราคาคอร์สเรียนครับ' },
    customer: { membershipTier: 'MEMBER' },
    channel: 'facebook'
  };

  it('should match a rule based on keywords', async () => {
    const mockPrisma = {
      notificationRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            ruleId: 'NOT-001',
            name: 'Price Inquiry',
            event: 'MESSAGE_RECEIVED',
            conditions: { keywords: ['ราคา', 'คอร์ส'] },
            actions: { lineNotify: 'default' },
            isActive: true
          }
        ])
      }
    };

    await notificationEngine.evaluateRules('MESSAGE_RECEIVED', mockContext, mockPrisma);

    expect(mockPrisma.notificationRule.findMany).toHaveBeenCalled();
    expect(notificationQueue.add).toHaveBeenCalledWith('NOT-001', expect.objectContaining({
      ruleId: 'NOT-001'
    }));
  });

  it('should NOT match if keywords do not exist in content', async () => {
    const mockPrisma = {
      notificationRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            ruleId: 'NOT-001',
            name: 'Price Inquiry',
            event: 'MESSAGE_RECEIVED',
            conditions: { keywords: ['สลิป', 'โอนเงิน'] },
            actions: { lineNotify: 'default' },
            isActive: true
          }
        ])
      }
    };

    await notificationEngine.evaluateRules('MESSAGE_RECEIVED', mockContext, mockPrisma);

    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  it('should match a rule based on membership tier', async () => {
    const mockPrisma = {
      notificationRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            ruleId: 'NOT-002',
            name: 'VIP Alert',
            event: 'MESSAGE_RECEIVED',
            conditions: { membershipTier: 'VIP' },
            actions: { lineNotify: 'admin' },
            isActive: true
          }
        ])
      }
    };

    const vipContext = { ...mockContext, customer: { membershipTier: 'VIP' } };
    await notificationEngine.evaluateRules('MESSAGE_RECEIVED', vipContext, mockPrisma);

    expect(notificationQueue.add).toHaveBeenCalledWith('NOT-002', expect.any(Object));
  });

  it('should match a catch-all rule (no conditions)', async () => {
    const mockPrisma = {
      notificationRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            ruleId: 'NOT-003',
            name: 'Global Logger',
            event: 'MESSAGE_RECEIVED',
            conditions: {},
            actions: { log: true },
            isActive: true
          }
        ])
      }
    };

    await notificationEngine.evaluateRules('MESSAGE_RECEIVED', mockContext, mockPrisma);

    expect(notificationQueue.add).toHaveBeenCalledWith('NOT-003', expect.any(Object));
  });
});
