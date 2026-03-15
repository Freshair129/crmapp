import { describe, it, expect } from 'vitest'
import { calcROAS, calcCPA, calcCON } from '@/utils/marketingMetrics'

describe('marketingMetrics', () => {
  describe('calcROAS', () => {
    it('คำนวณ ROAS ถูกต้อง', () => {
      // revenue=10000, spend=2000 → 10000/2000 = 5
      expect(calcROAS(10000, 2000)).toBe(5)
    })
    it('คืน 0 เมื่อ spend เป็น 0', () => {
      expect(calcROAS(10000, 0)).toBe(0)
    })
    it('คืน 0 เมื่อ revenue เป็น 0', () => {
      expect(calcROAS(0, 2000)).toBe(0)
    })
    it('ROAS ต่ำกว่า 1 เมื่อ spend > revenue', () => {
      // revenue=500, spend=1000 → 500/1000 = 0.5
      expect(calcROAS(500, 1000)).toBe(0.5)
    })
  })

  describe('calcCPA', () => {
    it('คำนวณ CPA ถูกต้อง', () => {
      // spend=5000, transactions=10 → 5000/10 = 500
      expect(calcCPA(5000, 10)).toBe(500)
    })
    it('คืน 0 เมื่อ transactions เป็น 0', () => {
      expect(calcCPA(5000, 0)).toBe(0)
    })
    it('คืน 0 เมื่อ spend เป็น 0', () => {
      // spend=0, transactions=10 → 0/10 = 0
      expect(calcCPA(0, 10)).toBe(0)
    })
  })

  describe('calcCON', () => {
    // Signature: calcCON(transactions, costPerResult)
    // Formula: transactions / costPerResult
    it('คำนวณ CON ถูกต้อง', () => {
      // transactions=10, costPerResult=500 → 10/500 = 0.02
      expect(calcCON(10, 500)).toBe(0.02)
    })
    it('คืน 0 เมื่อ costPerResult เป็น 0', () => {
      expect(calcCON(10, 0)).toBe(0)
    })
    it('คืน 0 เมื่อ transactions เป็น 0', () => {
      // transactions=0, costPerResult=500 → 0/500 = 0
      expect(calcCON(0, 500)).toBe(0)
    })
  })
})
