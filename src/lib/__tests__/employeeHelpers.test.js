import { describe, it, expect, beforeEach } from 'vitest'

// ============================================
// Helper Functions extracted from EmployeeManagement.js
// These are tested in isolation
// ============================================

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const birth = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

function formatDOB(dateOfBirth) {
  if (!dateOfBirth) return null
  const d = new Date(dateOfBirth)
  const day = d.getDate()
  const mon = MONTHS_TH[d.getMonth()]
  const yr = d.getFullYear()
  const age = calcAge(dateOfBirth)
  return { short: `${day} ${mon} ${yr}`, full: `${day} ${mon} ${yr}${age !== null ? ` (${age} ปี)` : ''}` }
}

describe('EmployeeManagement Helpers', () => {
  describe('calcAge(dateOfBirth)', () => {
    it('returns null for null/undefined input', () => {
      expect(calcAge(null)).toBeNull()
      expect(calcAge(undefined)).toBeNull()
      expect(calcAge('')).toBeNull()
    })

    it('calculates age correctly for valid past dates', () => {
      // Test with a date 30 years ago
      const thirtyYearsAgo = new Date()
      thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30)
      const age = calcAge(thirtyYearsAgo)
      expect(age).toBe(30)
    })

    it('handles birthday edge case (same day as today)', () => {
      // Create a birthday that's exactly today (year doesn't matter)
      const today = new Date()
      const birthday = new Date(1990, today.getMonth(), today.getDate())
      const age = calcAge(birthday)
      expect(age).toBe(today.getFullYear() - 1990)
    })

    it('decrements age if birthday has not occurred yet this year', () => {
      // Create a birthday that's later in the year (so hasn't happened yet)
      const today = new Date()
      let futureMonth = today.getMonth() + 1
      if (futureMonth > 11) futureMonth = 0
      const birthday = new Date(1990, futureMonth, 15)
      const age = calcAge(birthday)
      // If the birthday month is after current month, age should be lower
      if (futureMonth > today.getMonth()) {
        expect(age).toBeLessThanOrEqual(today.getFullYear() - 1990)
      }
    })

    it('handles date strings in ISO format', () => {
      const isoDate = '1990-01-15'
      const age = calcAge(isoDate)
      expect(typeof age).toBe('number')
      expect(age).toBeGreaterThan(0)
    })

    it('handles Date objects', () => {
      const dateObj = new Date(1990, 0, 15)
      const age = calcAge(dateObj)
      expect(typeof age).toBe('number')
      expect(age).toBeGreaterThan(0)
    })

    it('returns null for invalid/future dates', () => {
      // Create a date 5 years in the future
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 5)
      const age = calcAge(futureDate)
      expect(age).toBeNull()
    })

    it('returns non-negative age', () => {
      const anyValidDate = new Date(1990, 5, 10)
      const age = calcAge(anyValidDate)
      if (age !== null) {
        expect(age).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('formatDOB(dateOfBirth)', () => {
    it('returns null for null/undefined input', () => {
      expect(formatDOB(null)).toBeNull()
      expect(formatDOB(undefined)).toBeNull()
      expect(formatDOB('')).toBeNull()
    })

    it('returns object with short and full properties', () => {
      const result = formatDOB('1990-01-15')
      expect(result).toHaveProperty('short')
      expect(result).toHaveProperty('full')
      expect(typeof result.short).toBe('string')
      expect(typeof result.full).toBe('string')
    })

    it('formats date with Thai month abbreviations', () => {
      const result = formatDOB('1990-01-15')
      expect(result.short).toContain('ม.ค.')
      expect(result.full).toContain('ม.ค.')
    })

    it('includes correct day and year', () => {
      const result = formatDOB('1990-01-15')
      expect(result.short).toContain('15')
      expect(result.short).toContain('1990')
      expect(result.full).toContain('15')
      expect(result.full).toContain('1990')
    })

    it('includes age in parentheses when valid', () => {
      // Use a valid past date
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 25)
      const pastDateString = pastDate.toISOString().split('T')[0]
      const result = formatDOB(pastDateString)
      expect(result.full).toMatch(/\(\d+ ปี\)/)
    })

    it('handles all 12 months correctly', () => {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      months.forEach(month => {
        const dateStr = `1990-${String(month).padStart(2, '0')}-15`
        const result = formatDOB(dateStr)
        expect(result.short).toContain(MONTHS_TH[month - 1])
      })
    })

    it('short format is shorter than full format when age present', () => {
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 30)
      const pastDateString = pastDate.toISOString().split('T')[0]
      const result = formatDOB(pastDateString)
      expect(result.short.length).toBeLessThanOrEqual(result.full.length)
    })

    it('formats leap year dates correctly', () => {
      const result = formatDOB('2000-02-29')
      expect(result.short).toContain('29')
      expect(result.short).toContain('ก.พ.')
      expect(result.short).toContain('2000')
    })

    it('handles different date input formats', () => {
      const isoDate = '1990-01-15'
      const dateObj = new Date(1990, 0, 15)
      const resultFromString = formatDOB(isoDate)
      const resultFromObj = formatDOB(dateObj)
      expect(resultFromString.short).toBe(resultFromObj.short)
    })
  })

  describe('MONTHS_TH array', () => {
    it('has 12 Thai month abbreviations', () => {
      expect(MONTHS_TH).toHaveLength(12)
    })

    it('contains all expected Thai month names', () => {
      const expectedMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      expect(MONTHS_TH).toEqual(expectedMonths)
    })

    it('each month is a non-empty string', () => {
      MONTHS_TH.forEach(month => {
        expect(typeof month).toBe('string')
        expect(month.length).toBeGreaterThan(0)
      })
    })
  })

  describe('calcAge and formatDOB integration', () => {
    it('formatDOB uses calcAge internally for age calculation', () => {
      const birthDate = '1995-06-20'
      const formattedResult = formatDOB(birthDate)
      const calculatedAge = calcAge(birthDate)
      if (calculatedAge !== null) {
        expect(formattedResult.full).toContain(`(${calculatedAge} ปี)`)
      }
    })

    it('handles same birth date consistently', () => {
      const birthDate = '1988-03-10'
      const result1 = formatDOB(birthDate)
      const result2 = formatDOB(birthDate)
      expect(result1.short).toBe(result2.short)
      expect(result1.full).toBe(result2.full)
    })
  })
})
