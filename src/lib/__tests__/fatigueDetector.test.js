import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectCreativeFatigue } from '@/services/fatigueDetector'

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(),
}))

import { getPrisma } from '@/lib/db'

// Helper: build a mock Ad row with adSet/campaign nested
function makeAd({ adId, name, spend, ageDays, roas = 2.5 }) {
  const createdAt = new Date(Date.now() - ageDays * 86_400_000)
  return {
    adId,
    name,
    spend,
    roas,
    createdAt,
    status: 'ACTIVE',
    adSet: {
      name: `AdSet for ${adId}`,
      campaign: { name: `Campaign for ${adId}` },
    },
  }
}

describe('fatigueDetector — detectCreativeFatigue', () => {
  let mockPrisma

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = {
      ad: {
        findMany: vi.fn(),
      },
    }
    getPrisma.mockResolvedValue(mockPrisma)
  })

  it('คืน empty array เมื่อไม่มี ads', async () => {
    mockPrisma.ad.findMany.mockResolvedValue([])

    const result = await detectCreativeFatigue()

    expect(result).toEqual([])
  })

  it('กรอง ads ที่ ageDays < thresholdDays ออก', async () => {
    // Ad with only 10 days old — below default threshold of 30
    mockPrisma.ad.findMany.mockResolvedValue([
      makeAd({ adId: 'AD-young', name: 'Young Ad', spend: 5000, ageDays: 10 }),
    ])

    const result = await detectCreativeFatigue(30, 1000)

    expect(result).toEqual([])
  })

  it('DB query กรอง spend <= minSpend ผ่าน Prisma where clause', async () => {
    // The DB layer applies the spend filter (gt: minSpend).
    // Simulate that Prisma already filtered them out.
    mockPrisma.ad.findMany.mockResolvedValue([])

    await detectCreativeFatigue(30, 2000)

    const whereArg = mockPrisma.ad.findMany.mock.calls[0][0].where
    expect(whereArg.spend).toEqual({ gt: 2000 })
    expect(whereArg.status).toBe('ACTIVE')
  })

  it('คืน ads ที่ผ่านเกณฑ์ทั้งหมด', async () => {
    mockPrisma.ad.findMany.mockResolvedValue([
      makeAd({ adId: 'AD-old', name: 'Old Ad', spend: 9000, ageDays: 45 }),
    ])

    const result = await detectCreativeFatigue(30, 1000)

    expect(result).toHaveLength(1)
    expect(result[0].adId).toBe('AD-old')
    expect(result[0].ageDays).toBeGreaterThanOrEqual(30)
  })

  it('เรียง ads โดย ageDays DESC (มากที่สุดอยู่ก่อน)', async () => {
    mockPrisma.ad.findMany.mockResolvedValue([
      makeAd({ adId: 'AD-35', name: 'Ad 35d', spend: 3000, ageDays: 35 }),
      makeAd({ adId: 'AD-60', name: 'Ad 60d', spend: 5000, ageDays: 60 }),
      makeAd({ adId: 'AD-45', name: 'Ad 45d', spend: 4000, ageDays: 45 }),
    ])

    const result = await detectCreativeFatigue(30, 1000)

    expect(result).toHaveLength(3)
    expect(result[0].ageDays).toBeGreaterThanOrEqual(result[1].ageDays)
    expect(result[1].ageDays).toBeGreaterThanOrEqual(result[2].ageDays)
  })

  it('shape ของ result มีฟิลด์ครบตามที่ระบุ', async () => {
    mockPrisma.ad.findMany.mockResolvedValue([
      makeAd({ adId: 'AD-shape', name: 'Shape Test Ad', spend: 8000, ageDays: 40, roas: 3.2 }),
    ])

    const result = await detectCreativeFatigue(30, 1000)

    const item = result[0]
    expect(item).toHaveProperty('adId', 'AD-shape')
    expect(item).toHaveProperty('adName', 'Shape Test Ad')
    expect(item).toHaveProperty('adSetName')
    expect(item).toHaveProperty('campaignName')
    expect(item).toHaveProperty('ageDays')
    expect(item).toHaveProperty('totalSpend', 8000)
    expect(item).toHaveProperty('roas', 3.2)
  })

  it('ใช้ค่า default thresholdDays=30 และ minSpend=1000 เมื่อไม่ส่ง args', async () => {
    mockPrisma.ad.findMany.mockResolvedValue([])

    await detectCreativeFatigue()

    const whereArg = mockPrisma.ad.findMany.mock.calls[0][0].where
    expect(whereArg.spend).toEqual({ gt: 1000 })
  })

  it('คืน empty array เมื่อ ads มีอยู่แต่อายุต่ำกว่า threshold ทั้งหมด', async () => {
    mockPrisma.ad.findMany.mockResolvedValue([
      makeAd({ adId: 'AD-new-1', name: 'New 1', spend: 5000, ageDays: 5 }),
      makeAd({ adId: 'AD-new-2', name: 'New 2', spend: 7000, ageDays: 15 }),
    ])

    const result = await detectCreativeFatigue(30, 1000)

    expect(result).toEqual([])
  })
})
