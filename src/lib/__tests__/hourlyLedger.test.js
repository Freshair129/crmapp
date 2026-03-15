import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appendLedgerIfChanged } from '@/services/hourlyLedger'

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(),
}))

import { getPrisma } from '@/lib/db'

describe('hourlyLedger — appendLedgerIfChanged', () => {
  let mockPrisma

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = {
      adHourlyLedger: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    }
    getPrisma.mockResolvedValue(mockPrisma)
  })

  const adId = 'AD-001'
  const hourDate = new Date('2026-03-15T10:00:00Z')
  const current = { spend: 1500, impressions: 5000, clicks: 120 }

  it('คืน true และ insert เมื่อไม่มี entry ก่อนหน้า (lastEntry = null)', async () => {
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue(null)
    mockPrisma.adHourlyLedger.create.mockResolvedValue({})

    const result = await appendLedgerIfChanged(adId, hourDate, current)

    expect(result).toBe(true)
    expect(mockPrisma.adHourlyLedger.create).toHaveBeenCalledOnce()
  })

  it('คืน false และไม่ insert เมื่อ metrics ไม่เปลี่ยนแปลง', async () => {
    // Last entry has same metrics as current
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue({
      spend: current.spend,
      impressions: current.impressions,
      clicks: current.clicks,
    })

    const result = await appendLedgerIfChanged(adId, hourDate, current)

    expect(result).toBe(false)
    expect(mockPrisma.adHourlyLedger.create).not.toHaveBeenCalled()
  })

  it('คืน true เมื่อ spend เปลี่ยนแปลง', async () => {
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue({
      spend: 1000,             // different
      impressions: current.impressions,
      clicks: current.clicks,
    })
    mockPrisma.adHourlyLedger.create.mockResolvedValue({})

    const result = await appendLedgerIfChanged(adId, hourDate, current)

    expect(result).toBe(true)
    expect(mockPrisma.adHourlyLedger.create).toHaveBeenCalledOnce()
  })

  it('คืน true เมื่อ impressions เปลี่ยนแปลง', async () => {
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue({
      spend: current.spend,
      impressions: 9999,       // different
      clicks: current.clicks,
    })
    mockPrisma.adHourlyLedger.create.mockResolvedValue({})

    const result = await appendLedgerIfChanged(adId, hourDate, current)

    expect(result).toBe(true)
    expect(mockPrisma.adHourlyLedger.create).toHaveBeenCalledOnce()
  })

  it('คืน true เมื่อ clicks เปลี่ยนแปลง', async () => {
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue({
      spend: current.spend,
      impressions: current.impressions,
      clicks: 1,               // different
    })
    mockPrisma.adHourlyLedger.create.mockResolvedValue({})

    const result = await appendLedgerIfChanged(adId, hourDate, current)

    expect(result).toBe(true)
    expect(mockPrisma.adHourlyLedger.create).toHaveBeenCalledOnce()
  })

  it('create ถูกเรียกด้วย data ที่ถูกต้อง', async () => {
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue(null)
    mockPrisma.adHourlyLedger.create.mockResolvedValue({})

    await appendLedgerIfChanged(adId, hourDate, current)

    const createCall = mockPrisma.adHourlyLedger.create.mock.calls[0][0]
    expect(createCall.data.adId).toBe(adId)
    expect(createCall.data.spend).toBe(current.spend)
    expect(createCall.data.impressions).toBe(current.impressions)
    expect(createCall.data.clicks).toBe(current.clicks)
    // hour derived from hourDate.getHours() — 10 in UTC
    expect(createCall.data.hour).toBe(hourDate.getHours())
  })

  it('findFirst ถูก query ด้วย adId, date, hour ที่ถูกต้อง', async () => {
    mockPrisma.adHourlyLedger.findFirst.mockResolvedValue(null)
    mockPrisma.adHourlyLedger.create.mockResolvedValue({})

    await appendLedgerIfChanged(adId, hourDate, current)

    const whereArg = mockPrisma.adHourlyLedger.findFirst.mock.calls[0][0].where
    expect(whereArg.adId).toBe(adId)
    expect(whereArg.hour).toBe(hourDate.getHours())
  })
})
