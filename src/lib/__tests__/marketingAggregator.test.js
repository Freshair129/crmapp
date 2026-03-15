import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aggregateHierarchy } from '@/services/marketingAggregator'

// Mock getPrisma from lib/db
vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(),
}))

// Mock logger so it doesn't produce noise
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { getPrisma } from '@/lib/db'

describe('marketingAggregator', () => {
  let mockPrisma

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = {
      ad: {
        groupBy: vi.fn(),
      },
      adSet: {
        findMany: vi.fn(),
      },
    }
    getPrisma.mockResolvedValue(mockPrisma)
  })

  it('รวม spend จาก Ad level ขึ้นมา AdSet ได้ถูกต้อง', async () => {
    // Two ads belonging to the same adset
    mockPrisma.ad.groupBy.mockResolvedValue([
      {
        adSetId: 'adset-001',
        _sum: { spend: 3000, impressions: 10000, clicks: 200 },
      },
    ])
    mockPrisma.adSet.findMany.mockResolvedValue([
      { id: 'adset-001', campaignId: 'camp-001' },
    ])

    const result = await aggregateHierarchy(new Date())

    expect(result.adsets).toHaveLength(1)
    expect(result.adsets[0]).toEqual({
      adSetId: 'adset-001',
      spend: 3000,
      impressions: 10000,
      clicks: 200,
    })
  })

  it('รวม spend จาก AdSet ขึ้นมา Campaign ได้ถูกต้อง', async () => {
    // Two adsets belonging to the same campaign
    mockPrisma.ad.groupBy.mockResolvedValue([
      {
        adSetId: 'adset-001',
        _sum: { spend: 1500, impressions: 5000, clicks: 100 },
      },
      {
        adSetId: 'adset-002',
        _sum: { spend: 2500, impressions: 8000, clicks: 150 },
      },
    ])
    mockPrisma.adSet.findMany.mockResolvedValue([
      { id: 'adset-001', campaignId: 'camp-001' },
      { id: 'adset-002', campaignId: 'camp-001' },
    ])

    const result = await aggregateHierarchy(new Date())

    expect(result.campaigns).toHaveLength(1)
    expect(result.campaigns[0]).toEqual({
      campaignId: 'camp-001',
      spend: 4000,       // 1500 + 2500
      impressions: 13000, // 5000 + 8000
      clicks: 250,        // 100 + 150
    })
  })

  it('adsets ที่ไม่มี campaignId mapping จะไม่ถูกรวมใน campaigns', async () => {
    mockPrisma.ad.groupBy.mockResolvedValue([
      {
        adSetId: 'adset-orphan',
        _sum: { spend: 999, impressions: 1000, clicks: 10 },
      },
    ])
    // No mapping returned — adset-orphan has no campaign
    mockPrisma.adSet.findMany.mockResolvedValue([])

    const result = await aggregateHierarchy(new Date())

    expect(result.adsets).toHaveLength(1)
    expect(result.campaigns).toHaveLength(0)
  })

  it('คืน empty arrays ถ้าไม่มี ads', async () => {
    mockPrisma.ad.groupBy.mockResolvedValue([])
    mockPrisma.adSet.findMany.mockResolvedValue([])

    const result = await aggregateHierarchy(new Date())

    expect(result.adsets).toEqual([])
    expect(result.campaigns).toEqual([])
  })

  it('handle _sum null values (Prisma returns null for empty groups)', async () => {
    mockPrisma.ad.groupBy.mockResolvedValue([
      {
        adSetId: 'adset-001',
        _sum: { spend: null, impressions: null, clicks: null },
      },
    ])
    mockPrisma.adSet.findMany.mockResolvedValue([
      { id: 'adset-001', campaignId: 'camp-001' },
    ])

    const result = await aggregateHierarchy(new Date())

    // Null coalesced to 0
    expect(result.adsets[0].spend).toBe(0)
    expect(result.adsets[0].impressions).toBe(0)
    expect(result.adsets[0].clicks).toBe(0)
  })

  it('adsets หลาย campaign แยกกันได้ถูกต้อง', async () => {
    mockPrisma.ad.groupBy.mockResolvedValue([
      {
        adSetId: 'adset-A',
        _sum: { spend: 1000, impressions: 3000, clicks: 50 },
      },
      {
        adSetId: 'adset-B',
        _sum: { spend: 2000, impressions: 6000, clicks: 100 },
      },
    ])
    mockPrisma.adSet.findMany.mockResolvedValue([
      { id: 'adset-A', campaignId: 'camp-X' },
      { id: 'adset-B', campaignId: 'camp-Y' },
    ])

    const result = await aggregateHierarchy(new Date())

    expect(result.campaigns).toHaveLength(2)
    const campX = result.campaigns.find((c) => c.campaignId === 'camp-X')
    const campY = result.campaigns.find((c) => c.campaignId === 'camp-Y')
    expect(campX.spend).toBe(1000)
    expect(campY.spend).toBe(2000)
  })
})
