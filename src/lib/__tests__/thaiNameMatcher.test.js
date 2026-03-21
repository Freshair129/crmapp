import { describe, it, expect } from 'vitest';
import {
  normalizeThai,
  phoneticNormalize,
  matchName,
  buildSearchableNames,
  bestMatchScore,
  rankByNameMatch,
} from '../thaiNameMatcher.js';

// ─── normalizeThai ─────────────────────────────────────────────────────────

describe('normalizeThai', () => {
  it('strips zero-width characters', () => {
    expect(normalizeThai('สม\u200Bชาย')).toBe('สมชาย');
    expect(normalizeThai('\uFEFFบอส\u200C')).toBe('บอส');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeThai('  สมชาย   นวล  ')).toBe('สมชาย นวล');
  });

  it('lowercases Latin characters', () => {
    expect(normalizeThai('Boss Suanranger')).toBe('boss suanranger');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeThai(null)).toBe('');
    expect(normalizeThai(undefined)).toBe('');
    expect(normalizeThai('')).toBe('');
  });
});

// ─── phoneticNormalize ─────────────────────────────────────────────────────

describe('phoneticNormalize', () => {
  it('strips Thai tonal marks', () => {
    expect(phoneticNormalize('บ๊อส')).toBe('บอส');
    expect(phoneticNormalize('น้อง')).toBe('นอง');
    expect(phoneticNormalize('ก้อย')).toBe('กอย');
  });

  it('strips การันต์ (์)', () => {
    expect(phoneticNormalize('เชษฐ์')).toBe('เชสท');
    // ษ → ส (phonetic), ฐ → ท (phonetic), ์ stripped
  });

  it('simplifies phonetically similar consonants', () => {
    // ศ → ส, ษ → ส
    expect(phoneticNormalize('ศิริ')).toBe('สิริ');
    // ภ → พ
    expect(phoneticNormalize('ภาคิน')).toBe('พาคิน');
    // ฐ → ท
    expect(phoneticNormalize('ฐิติ')).toBe('ทิทิ');
  });
});

// ─── matchName — Exact ─────────────────────────────────────────────────────

describe('matchName — exact', () => {
  it('returns 1.0 for identical names', () => {
    expect(matchName('สมชาย', 'สมชาย')).toBe(1.0);
  });

  it('returns 1.0 after normalization (zero-width)', () => {
    expect(matchName('สม\u200Bชาย', 'สมชาย')).toBe(1.0);
  });

  it('returns 1.0 for case-insensitive Latin', () => {
    expect(matchName('Boss', 'boss')).toBe(1.0);
  });

  it('returns 0 for empty input', () => {
    expect(matchName('', 'สมชาย')).toBe(0);
    expect(matchName('สมชาย', '')).toBe(0);
  });
});

// ─── matchName — Contains ──────────────────────────────────────────────────

describe('matchName — contains', () => {
  it('returns high score when query is substring of target', () => {
    const score = matchName('สมชาย', 'สมชาย นวลจันทร์');
    expect(score).toBeGreaterThanOrEqual(0.70);
    expect(score).toBeLessThanOrEqual(0.85);
  });

  it('returns high score when target is substring of query', () => {
    const score = matchName('สมชาย นวลจันทร์', 'สมชาย');
    expect(score).toBeGreaterThanOrEqual(0.70);
  });
});

// ─── matchName — Phonetic ──────────────────────────────────────────────────

describe('matchName — phonetic', () => {
  it('matches บ๊อส vs บอส (tonal mark difference)', () => {
    expect(matchName('บ๊อส', 'บอส')).toBeGreaterThanOrEqual(0.9);
  });

  it('matches เชษฐ์ vs เชษฐ (การันต์ difference)', () => {
    expect(matchName('เชษฐ์', 'เชษฐ')).toBeGreaterThanOrEqual(0.85);
  });

  it('matches น้อง vs น๊อง (tonal variant)', () => {
    expect(matchName('น้อง', 'น๊อง')).toBeGreaterThanOrEqual(0.9);
  });
});

// ─── matchName — Fuzzy ─────────────────────────────────────────────────────

describe('matchName — fuzzy', () => {
  it('matches สมชาย vs สมชาญ (similar ending)', () => {
    expect(matchName('สมชาย', 'สมชาญ')).toBeGreaterThanOrEqual(0.6);
  });

  it('matches swapped first/last name', () => {
    const score = matchName('สมชาย นวล', 'นวล สมชาย');
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('very different names get low score', () => {
    expect(matchName('สมชาย', 'มาลี')).toBeLessThan(0.4);
  });

  it('completely unrelated names score near 0', () => {
    expect(matchName('กรุงเทพ', 'ซูชิ')).toBeLessThan(0.3);
  });
});

// ─── matchName — Thai + Latin mixed ────────────────────────────────────────

describe('matchName — mixed Thai/Latin', () => {
  it('matches Boss สมชาย vs สมชาย', () => {
    const score = matchName('Boss สมชาย', 'สมชาย');
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it('partial name match across languages', () => {
    const score = matchName('Boss', 'Boss Suanranger');
    expect(score).toBeGreaterThanOrEqual(0.7);
  });
});

// ─── buildSearchableNames ──────────────────────────────────────────────────

describe('buildSearchableNames', () => {
  it('builds variants from full record', () => {
    const variants = buildSearchableNames({
      firstName: 'สมชาย',
      lastName: 'นวล',
      nickName: 'บอส',
      facebookName: 'Boss Somchai',
    });
    expect(variants).toContain('สมชาย นวล');
    expect(variants).toContain('นวล สมชาย');
    expect(variants).toContain('สมชาย');
    expect(variants).toContain('นวล');
    expect(variants).toContain('บอส');
    expect(variants).toContain('boss somchai');
  });

  it('handles missing fields', () => {
    const variants = buildSearchableNames({ nickName: 'แอน' });
    expect(variants).toEqual(['แอน']);
  });

  it('returns empty for null record', () => {
    expect(buildSearchableNames(null)).toEqual([]);
    expect(buildSearchableNames({})).toEqual([]);
  });
});

// ─── bestMatchScore ────────────────────────────────────────────────────────

describe('bestMatchScore', () => {
  it('matches against best variant', () => {
    const score = bestMatchScore('บอส', {
      firstName: 'สมชาย',
      lastName: 'นวล',
      nickName: 'บอส',
    });
    expect(score).toBe(1.0);
  });

  it('matches facebookName when other fields differ', () => {
    const score = bestMatchScore('Boss', {
      firstName: 'สมชาย',
      facebookName: 'Boss Somchai',
    });
    expect(score).toBeGreaterThanOrEqual(0.7);
  });
});

// ─── rankByNameMatch ───────────────────────────────────────────────────────

describe('rankByNameMatch', () => {
  const records = [
    { firstName: 'สมชาย', lastName: 'นวล', nickName: 'บอส' },
    { firstName: 'มาลี', lastName: 'แก้ว', nickName: 'แอน' },
    { firstName: 'สมชาญ', lastName: 'นวล', nickName: 'ชาญ' },
  ];

  it('ranks exact match first', () => {
    const results = rankByNameMatch('บอส', records);
    expect(results[0].record.nickName).toBe('บอส');
    expect(results[0].score).toBe(1.0);
  });

  it('ranks similar names above threshold', () => {
    const results = rankByNameMatch('สมชาย', records, 0.5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].record.firstName).toBe('สมชาย');
  });

  it('filters below threshold', () => {
    const results = rankByNameMatch('สมชาย', records, 0.95);
    // Only exact match should pass
    expect(results.length).toBe(1);
    expect(results[0].record.firstName).toBe('สมชาย');
  });

  it('returns empty for no matches', () => {
    const results = rankByNameMatch('ไม่มีใคร', records, 0.8);
    expect(results.length).toBe(0);
  });
});
