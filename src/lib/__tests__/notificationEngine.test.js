import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationEngine } from '../notificationEngine';

// Mock QStash Client correctly
const mockPublishJSON = vi.fn().mockResolvedValue({ messageId: 'msg_123' });

vi.mock('@upstash/qstash', () => {
  return {
    Client: vi.fn().mockImplementation(function() {
      return {
        publishJSON: mockPublishJSON
      };
    })
  };
});

describe('NotificationEngine', () => {
  let engine;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = 'test-token';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    engine = new NotificationEngine();
  });

  const mockContext = {
    message: { content: 'สอบถามราคาคอร์สเรียนครับ' },
    customer: { membershipTier: 'MEMBER' },
    channel: 'facebook'
  };

  it('should match a rule based on keywords and enqueue to QStash', async () => {
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

    await engine.evaluateRules('MESSAGE_RECEIVED', mockContext, mockPrisma);

    expect(mockPrisma.notificationRule.findMany).toHaveBeenCalled();
    expect(mockPublishJSON).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({
        ruleId: 'NOT-001'
      }),
      retries: 5
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

    await engine.evaluateRules('MESSAGE_RECEIVED', mockContext, mockPrisma);

    expect(mockPublishJSON).not.toHaveBeenCalled();
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
    await engine.evaluateRules('MESSAGE_RECEIVED', vipContext, mockPrisma);

    expect(mockPublishJSON).toHaveBeenCalled();
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

    await engine.evaluateRules('MESSAGE_RECEIVED', mockContext, mockPrisma);

    expect(mockPublishJSON).toHaveBeenCalled();
  });
});
