import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as marketingRepo from '@/lib/repositories/marketingRepo';
import { getPrisma } from '@/lib/db';
import { cache as redis } from '@/lib/redis';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
    cache: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

describe('marketingRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            campaign: {
                findUnique: vi.fn(),
                update: vi.fn(),
                upsert: vi.fn(),
            },
            adSet: {
                findMany: vi.fn(),
                upsert: vi.fn(),
            },
            ad: {
                findMany: vi.fn(),
                upsert: vi.fn(),
            },
            adCreative: {
                findMany: vi.fn(),
                upsert: vi.fn(),
            },
            adDailyMetric: {
                findMany: vi.fn(),
                aggregate: vi.fn(),
                upsert: vi.fn(),
                createMany: vi.fn(),
                updateMany: vi.fn(),
            },
            adHourlyMetric: {
                findMany: vi.fn(),
                upsert: vi.fn(),
            },
            adHourlyLedger: {
                findFirst: vi.fn(),
                create: vi.fn(),
            },
            auditLog: {
                create: vi.fn(),
            },
            customer: {
                count: vi.fn(),
            },
            conversation: {
                groupBy: vi.fn(),
            },
            order: {
                aggregate: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getSyncStatus', () => {
        it('should fetch from redis', async () => {
            redis.get.mockResolvedValue('2026-03-18T10:00:00Z');
            const result = await marketingRepo.getSyncStatus();
            expect(result).toBe('2026-03-18T10:00:00Z');
            expect(redis.get).toHaveBeenCalledWith('meta:last_sync');
        });
    });

    describe('getActiveAds', () => {
        it('should fetch active ads', async () => {
            mockPrisma.ad.findMany.mockResolvedValue([{ adId: 'ad-1' }]);
            const result = await marketingRepo.getActiveAds();
            expect(result).toHaveLength(1);
            expect(mockPrisma.ad.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { status: 'ACTIVE' }
            }));
        });
    });

    describe('getDailyAggregatedMetrics', () => {
        it('should aggregate metrics by date', async () => {
            mockPrisma.adDailyMetric.findMany.mockResolvedValue([
                { date: new Date('2026-03-18'), spend: 100, impressions: 1000, clicks: 50, revenue: 200 },
                { date: new Date('2026-03-18'), spend: 50, impressions: 500, clicks: 25, revenue: 100 },
            ]);

            const result = await marketingRepo.getDailyAggregatedMetrics('2026-03-18');
            expect(result).toHaveLength(1);
            expect(result[0].spend).toBe(150);
            expect(result[0].revenue).toBe(300);
            expect(result[0].roas).toBe(2);
        });
    });

    describe('getMarketingInsights', () => {
        it('should aggregate metrics from multiple sources', async () => {
            mockPrisma.adDailyMetric.aggregate
                .mockResolvedValueOnce({ _sum: { spend: 1000, impressions: 10000, clicks: 500, leads: 50, revenue: 5000 } })
                .mockResolvedValueOnce({ _sum: { revenue: 8000, purchases: 40 } });
            
            mockPrisma.customer.count
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(80)  // active
                .mockResolvedValueOnce(10); // churned
            
            mockPrisma.conversation.groupBy.mockResolvedValue(Array(20).fill({ customerId: 'x' }));
            
            mockPrisma.order.aggregate
                .mockResolvedValueOnce({ _sum: { totalAmount: 12000 } })
                .mockResolvedValueOnce({ _sum: { totalAmount: 15000 }, _count: { id: 50 } });

            const result = await marketingRepo.getMarketingInsights();

            expect(result.spend).toBe(1000);
            expect(result.totalCustomers).toBe(100);
            expect(result.allTimeRevenue).toBe(8000);
            expect(result.crmTotalRevenue).toBe(12000);
            expect(result.avgLTV).toBe(300); // 15000 / 50
        });
    });


    describe('updateCampaign', () => {
        it('should call prisma.update', async () => {
            mockPrisma.campaign.update.mockResolvedValue({ id: 'c1', name: 'New Name' });
            await marketingRepo.updateCampaign('c1', { name: 'New Name' });
            expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
                where: { id: 'c1' },
                data: { name: 'New Name' }
            });
        });
    });

    describe('upsertCampaign', () => {
        it('should call prisma.upsert', async () => {
            mockPrisma.campaign.upsert.mockResolvedValue({ id: 'c1' });
            await marketingRepo.upsertCampaign('fb-c1', { name: 'Campaign 1' });
            expect(mockPrisma.campaign.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { campaignId: 'fb-c1' },
                update: { name: 'Campaign 1' }
            }));
        });
    });

    describe('getCampaignByFBId', () => {
        it('should fetch by campaignId', async () => {
            mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'uuid-1', campaignId: 'fb-c1' });
            const result = await marketingRepo.getCampaignByFBId('fb-c1');
            expect(result.id).toBe('uuid-1');
        });
    });

    describe('upsertAdSet', () => {
        it('should call prisma.upsert', async () => {
            mockPrisma.adSet.upsert.mockResolvedValue({ id: 's1' });
            await marketingRepo.upsertAdSet('fb-s1', { name: 'AdSet 1', campaignId: 'c1' });
            expect(mockPrisma.adSet.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { adSetId: 'fb-s1' }
            }));
        });
    });

    describe('getAllAdSetFBIds', () => {
        it('should return a map of FB IDs to internal IDs', async () => {
            mockPrisma.adSet.findMany.mockResolvedValue([{ id: 's1', adSetId: 'fb-s1' }]);
            const result = await marketingRepo.getAllAdSetFBIds();
            expect(result.get('fb-s1')).toBe('s1');
        });
    });

    describe('upsertAd', () => {
        it('should call prisma.upsert', async () => {
            mockPrisma.ad.upsert.mockResolvedValue({ id: 'a1' });
            await marketingRepo.upsertAd('fb-a1', { name: 'Ad 1', adSetId: 's1' });
            expect(mockPrisma.ad.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { adId: 'fb-a1' }
            }));
        });
    });

    describe('upsertAdCreative', () => {
        it('should call prisma.upsert', async () => {
            mockPrisma.adCreative.upsert.mockResolvedValue({ id: 'cr1' });
            await marketingRepo.upsertAdCreative('fb-cr1', { body: 'Text' });
            expect(mockPrisma.adCreative.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { creativeId: 'fb-cr1' }
            }));
        });
    });

    describe('getAllCreativeFBIds', () => {
        it('should return a map of FB IDs to internal IDs', async () => {
            mockPrisma.adCreative.findMany.mockResolvedValue([{ id: 'cr1', creativeId: 'fb-cr1' }]);
            const result = await marketingRepo.getAllCreativeFBIds();
            expect(result.get('fb-cr1')).toBe('cr1');
        });
    });

    describe('bulkUpsertDailyMetrics', () => {
        it('should use transaction for bulk operations', async () => {
            mockPrisma.adDailyMetric.createMany = vi.fn().mockResolvedValue({ count: 1 });
            mockPrisma.adDailyMetric.updateMany = vi.fn().mockResolvedValue({ count: 1 });
            mockPrisma.$transaction = vi.fn(async (items) => items);

            const rows = [{ adId: 'ad1', date: new Date(), spend: 50 }];
            await marketingRepo.bulkUpsertDailyMetrics(rows);
            
            expect(mockPrisma.$transaction).toHaveBeenCalled();
            expect(mockPrisma.adDailyMetric.createMany).toHaveBeenCalled();
        });
    });


    describe('appendHourlyLedgerIfChanged', () => {
        it('should create new entry if metrics changed', async () => {
            mockPrisma.adHourlyLedger = {
                findFirst: vi.fn().mockResolvedValue({ spend: 10, clicks: 1 }),
                create: vi.fn().mockResolvedValue({ id: 'l1' }),
            };
            const metrics = { spend: 20, clicks: 2, impressions: 100, leads: 0, purchases: 0, revenue: 0 };
            const result = await marketingRepo.appendHourlyLedgerIfChanged('ad1', '2026-03-18', 10, metrics);
            
            expect(mockPrisma.adHourlyLedger.create).toHaveBeenCalled();
            expect(result.id).toBe('l1');
        });

        it('should skip if metrics are same', async () => {
            mockPrisma.adHourlyLedger = {
                findFirst: vi.fn().mockResolvedValue({ spend: 10, clicks: 1, impressions: 100, leads: 0, purchases: 0, revenue: 0 }),
                create: vi.fn(),
            };
            const metrics = { spend: 10, clicks: 1, impressions: 100, leads: 0, purchases: 0, revenue: 0 };
            const result = await marketingRepo.appendHourlyLedgerIfChanged('ad1', '2026-03-18', 10, metrics);
            
            expect(mockPrisma.adHourlyLedger.create).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });
});


