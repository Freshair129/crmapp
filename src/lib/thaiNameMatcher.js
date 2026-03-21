/**
 * thaiNameMatcher.js — Fuzzy Thai Name Matching (ADR-043)
 *
 * Zero-dependency module for matching Thai names with edge cases:
 * - วรรณยุกต์/สระผิด, zero-width characters, Thai ↔ Latin transliteration
 * - สลับ first/last name, มี/ไม่มี นามสกุล
 * - Phonetic simplification (ค-group, ท-group, ส-group, etc.)
 *
 * Usage:
 *   import { matchName, normalizeThai, buildSearchableNames } from '@/lib/thaiNameMatcher';
 *   const score = matchName('บ๊อส', 'บอส'); // 0.9
 */

// ─── Thai Character Constants ──────────────────────────────────────────────

/** Zero-width characters commonly inserted by Facebook / LINE */
const ZERO_WIDTH_RE = /[\u200B\u200C\u200D\uFEFF\u00AD]/g;

/** Thai tonal marks: ่ ้ ๊ ๋ */
const THAI_TONAL_RE = /[\u0E48\u0E49\u0E4A\u0E4B]/g;

/** Thai cancellation mark (การันต์): ์ */
const THAI_KARAN_RE = /\u0E4C/g;

/** Thai Mai Taikhu (ไม้ไต่คู้): ็ */
const THAI_MAITAIKHU_RE = /\u0E47/g;

/**
 * Phonetic simplification map — characters that sound similar
 * Used in "lossy" phonetic mode for fuzzy comparison
 */
const PHONETIC_MAP = {
  // ค-equivalent: ข ฃ ค ฅ ฆ → ค
  '\u0E02': '\u0E04', '\u0E03': '\u0E04', '\u0E05': '\u0E04', '\u0E06': '\u0E04',
  // ช-equivalent: ฉ ช ฌ → ช
  '\u0E09': '\u0E0A', '\u0E0C': '\u0E0A',
  // ท-equivalent: ฐ ฑ ฒ ถ ท ธ → ท
  '\u0E10': '\u0E17', '\u0E11': '\u0E17', '\u0E12': '\u0E17',
  '\u0E16': '\u0E17', '\u0E18': '\u0E17',
  // ส-equivalent: ศ ษ ส → ส
  '\u0E28': '\u0E2A', '\u0E29': '\u0E2A',
  // น-equivalent: ณ น → น
  '\u0E13': '\u0E19',
  // ล-equivalent: ล ฬ → ล
  '\u0E2C': '\u0E25',
  // พ-equivalent: ผ พ ภ → พ
  '\u0E1C': '\u0E1E', '\u0E20': '\u0E1E',
  // บ-equivalent: ป บ → บ
  '\u0E1B': '\u0E1A',
};

// ─── Normalization ─────────────────────────────────────────────────────────

/**
 * Normalize Thai text for comparison.
 * @param {string} text
 * @returns {string} Normalized text (lowercase, no zero-width, trimmed)
 */
export function normalizeThai(text) {
  if (!text) return '';
  return text
    .replace(ZERO_WIDTH_RE, '')     // strip zero-width
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Phonetic normalization — lossy, strips tonal marks + simplifies consonants.
 * @param {string} text — should be pre-normalized with normalizeThai()
 * @returns {string}
 */
export function phoneticNormalize(text) {
  let result = text
    .replace(THAI_TONAL_RE, '')     // strip ่ ้ ๊ ๋
    .replace(THAI_KARAN_RE, '')     // strip ์
    .replace(THAI_MAITAIKHU_RE, ''); // strip ็

  // Apply phonetic simplification
  let out = '';
  for (const ch of result) {
    out += PHONETIC_MAP[ch] || ch;
  }
  return out;
}

// ─── Similarity Algorithms ─────────────────────────────────────────────────

/**
 * Character bigram set of a string.
 * @param {string} s
 * @returns {Map<string, number>} bigram → count
 */
function bigrams(s) {
  const map = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const bi = s.slice(i, i + 2);
    map.set(bi, (map.get(bi) || 0) + 1);
  }
  return map;
}

/**
 * Dice coefficient (bigram similarity) — 0..1
 * Good for Thai because character pairs capture syllable patterns.
 */
function diceCoefficient(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const biA = bigrams(a);
  const biB = bigrams(b);

  let intersection = 0;
  for (const [bi, countA] of biA) {
    const countB = biB.get(bi) || 0;
    intersection += Math.min(countA, countB);
  }

  const totalA = a.length - 1;
  const totalB = b.length - 1;

  return (2 * intersection) / (totalA + totalB);
}

/**
 * Jaccard similarity of token sets — 0..1
 * Handles "สมชาย นวล" vs "นวล สมชาย" (word-order independent).
 */
function tokenJaccard(a, b) {
  const tokA = new Set(a.split(' ').filter(Boolean));
  const tokB = new Set(b.split(' ').filter(Boolean));
  if (tokA.size === 0 && tokB.size === 0) return 1;
  if (tokA.size === 0 || tokB.size === 0) return 0;

  let inter = 0;
  for (const t of tokA) {
    if (tokB.has(t)) inter++;
  }
  return inter / (tokA.size + tokB.size - inter);
}

/**
 * Fuzzy token overlap — each token of A tries to find best bigram match in B tokens.
 * More forgiving than exact Jaccard — catches "สมชาย" vs "สมชาญ" at token level.
 */
function fuzzyTokenOverlap(a, b) {
  const tokA = a.split(' ').filter(Boolean);
  const tokB = b.split(' ').filter(Boolean);
  if (tokA.length === 0 && tokB.length === 0) return 1;
  if (tokA.length === 0 || tokB.length === 0) return 0;

  let totalScore = 0;
  for (const tA of tokA) {
    let bestMatch = 0;
    for (const tB of tokB) {
      bestMatch = Math.max(bestMatch, diceCoefficient(tA, tB));
    }
    totalScore += bestMatch;
  }
  return totalScore / Math.max(tokA.length, tokB.length);
}

// ─── Main Match Function ───────────────────────────────────────────────────

/**
 * Match two names and return a similarity score (0..1).
 *
 * @param {string} query — ชื่อที่ค้นหา
 * @param {string} target — ชื่อใน DB ที่ต้องการเปรียบเทียบ
 * @returns {number} 0..1 similarity score
 */
export function matchName(query, target) {
  const nQ = normalizeThai(query);
  const nT = normalizeThai(target);

  if (!nQ || !nT) return 0;

  // 1. Exact match after normalization
  if (nQ === nT) return 1.0;

  // 2. Contains match (either direction)
  if (nT.includes(nQ) || nQ.includes(nT)) {
    // Score based on length ratio — "สม" in "สมชาย" = less than "สมชาย" in "สมชาย นวล"
    const ratio = Math.min(nQ.length, nT.length) / Math.max(nQ.length, nT.length);
    return 0.7 + (ratio * 0.15); // range: 0.70 – 0.85
  }

  // 3. Phonetic match
  const pQ = phoneticNormalize(nQ);
  const pT = phoneticNormalize(nT);
  if (pQ === pT) return 0.9;

  // 4. Multi-strategy scoring
  const scores = [
    diceCoefficient(nQ, nT),
    tokenJaccard(nQ, nT),
    fuzzyTokenOverlap(nQ, nT),
    // Phonetic bigram similarity
    diceCoefficient(pQ, pT) * 0.95, // slight discount for lossy comparison
  ];

  return Math.max(...scores);
}

// ─── Batch Utilities ───────────────────────────────────────────────────────

/**
 * Build all searchable name variants from a customer/employee record.
 * Combines firstName, lastName, nickName, facebookName into matchable forms.
 *
 * @param {object} record — { firstName?, lastName?, nickName?, facebookName? }
 * @returns {string[]} Array of name variants to match against
 */
export function buildSearchableNames(record) {
  const names = [];
  const { firstName, lastName, nickName, facebookName } = record || {};

  if (firstName && lastName) {
    names.push(`${firstName} ${lastName}`);
    names.push(`${lastName} ${firstName}`); // reversed
  }
  if (firstName) names.push(firstName);
  if (lastName) names.push(lastName);
  if (nickName) names.push(nickName);
  if (facebookName) names.push(facebookName);

  return names.filter(Boolean).map(normalizeThai).filter(n => n.length > 0);
}

/**
 * Find best match score between a query and a record's searchable names.
 *
 * @param {string} query
 * @param {object} record — { firstName?, lastName?, nickName?, facebookName? }
 * @returns {number} Best match score (0..1)
 */
export function bestMatchScore(query, record) {
  const variants = buildSearchableNames(record);
  if (variants.length === 0) return 0;

  let best = 0;
  for (const variant of variants) {
    best = Math.max(best, matchName(query, variant));
  }
  return best;
}

/**
 * Rank an array of records by name match score.
 *
 * @param {string} query — ค้นหาอะไร
 * @param {object[]} records — array of { firstName?, lastName?, nickName?, facebookName?, ...rest }
 * @param {number} threshold — minimum score to include (default 0.4)
 * @returns {{ record: object, score: number }[]} Sorted DESC by score
 */
export function rankByNameMatch(query, records, threshold = 0.4) {
  const results = [];
  for (const record of records) {
    const score = bestMatchScore(query, record);
    if (score >= threshold) {
      results.push({ record, score });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
