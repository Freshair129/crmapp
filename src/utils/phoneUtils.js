/**
 * Phone number normalization utility (ADR-025 D1)
 * Converts any Thai phone format to E.164 standard.
 * No external dependencies — pure regex/string manipulation.
 */

/**
 * Normalizes a phone number to E.164 format.
 *
 * @param {string} raw - The raw phone number string to normalize.
 * @param {string} [defaultCountry='TH'] - The default country code for local numbers.
 * @returns {string|null} The normalized E.164 string, or null if unparseable.
 *
 * @example normalizePhone('081-234-5678')   // '+66812345678'
 * @example normalizePhone('0812345678')     // '+66812345678'
 * @example normalizePhone('6681234567')     // '+6681234567'
 * @example normalizePhone('+6681234567')    // '+6681234567'
 * @example normalizePhone('081 234 5678')   // '+66812345678'
 * @example normalizePhone('02-123-4567')    // '+6621234567'
 * @example normalizePhone('0014155552671')  // '+14155552671'
 * @example normalizePhone('0066812345678')  // '+66812345678'
 * @example normalizePhone('0612345678')     // '+66612345678'
 * @example normalizePhone('invalid-phone')  // null
 */
function normalizePhone(raw, defaultCountry = 'TH') {
  if (typeof raw !== 'string') return null;

  // Strip spaces, dashes, and parentheses
  let cleaned = raw.replace(/[\s\-\(\)]/g, '');

  // Normalize 00xx international prefix → +xx
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Thailand-specific local → E.164
  if (defaultCountry === 'TH') {
    // 0x... (9–10 digit local) → +66x...
    if (/^0\d{8,9}$/.test(cleaned)) {
      cleaned = '+66' + cleaned.slice(1);
    }
    // 66x... (without +) → +66x...
    else if (/^66\d{8,9}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    }
  }

  // Final E.164 validation: + followed by 7–15 digits, first digit non-zero
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(cleaned) ? cleaned : null;
}

export { normalizePhone };
