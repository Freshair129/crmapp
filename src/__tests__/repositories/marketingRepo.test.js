import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  upsertAdDailyMetric,
  upsertCampaign,
  getSyncStatus,
  updateSyncStatus
} from '@/lib/repositories/marketingRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/redis', () => ({ cache: { get: vi.fn(), set: vi.fn(), del: vi.fn() } }));
vi.mock('@/lib/dateFilters', () => ({ getMarketingRangeFilter: vi.fn(() => ({})) }));

// redis mock (getSyncStatus/updateSyncStatus ใช้ redis โดยตรง)
import { cache as redis } from '@/lib/redis';

describe('marketingRepo', () => {
  const mockPrisma = {
    adDailyMetric: { upsert: vi.fn() },
    campaign: { upsert: vi.fn(), update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getPrisma.mockResolvedValue(mockPrisma);
  });

  describe('upsertAdDailyMetric', () => {
    it('should call prisma.adDailyMetric.upsert with correct args', async () => {
      const adId = 'ad-123';
      const date = new Date('2026-03-24');
      const data = { spend: 100, impressions: 1000 };
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      mockPrisma.adDailyMetric.upsert.mockResolvedValue({ id: '1', adId, date: normalizedDate, ...data });

      const result = await upsertAdDailyMetric(adId, date, data);

      expect(mockPrisma.adDailyMetric.upsert).toHaveBeenCalledWith({
        where: { adId_date: { adId, date: normalizedDate } },
        create: { adId, date: normalizedDate, ...data },
        update: { ...data },
      });
      expect(result.adId).toBe(adId);
    });
  });

  describe('upsertCampaign', () => {
    it('should call prisma.campaign.upsert with correct args', async () => {
      const campaignId = 'camp-456';
      const data = { name: 'March Campaign', status: 'ACTIVE' };

      mockPrisma.campaign.upsert.mockResolvedValue({ id: '2', campaignId, ...data });

      const result = await upsertCampaign(campaignId, data);

      expect(mockPrisma.campaign.upsert).toHaveBeenCalledWith({
        where: { campaignId },
        create: { campaignId, ...data },
        update: { ...data },
      });
      expect(result.campaignId).toBe(campaignId);
    });
  });

  describe('getSyncStatus', () => {
    it('should get value from Redis', async () => {
      redis.get.mockResolvedValue('2026-03-24T00:00:00Z');
      const result = await getSyncStatus();
      expect(redis.get).toHaveBeenCalled();
      expect(result).toBe('2026-03-24T00:00:00Z');
    });

    it('should return null if no value in Redis', async () => {
      redis.get.mockResolvedValue(null);
      expect(await getSyncStatus()).toBeNull();
    });
  });

  describe('updateSyncStatus', () => {
    it('should set value in Redis', async () => {
      const value = '2026-03-24T00:00:00Z';
      redis.set.mockResolvedValue('OK');
      await updateSyncStatus(value);
      expect(redis.set).toHaveBeenCalledWith(expect.any(String), value);
    });
  });
});
