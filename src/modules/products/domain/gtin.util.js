/**
 * GTIN utilities:
 * - Supports GTIN-8, GTIN-12, GTIN-13, GTIN-14
 * - Computes check digit and validates full GTIN
 */

/**
 * Compute GTIN check digit for a numeric string without the check digit.
 * Supports base lengths: 7, 11, 12, 13 (for GTIN-8/12/13/14).
 * @param {string} base - numeric string without check digit
 * @returns {number} check digit (0-9)
 */
function computeCheckDigit(base) {
  if (!/^\d+$/.test(base)) {
    throw new Error("computeCheckDigit: base must be numeric");
  }
  const n = base.length; // 7, 11, 12, 13

  // General GS1 rule:
  // If base length is even -> weight 3 on even positions (from left, 1-based)
  // If base length is odd  -> weight 3 on odd positions (from left, 1-based)
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = base.charCodeAt(i) - 48; // fast parse int
    const pos = i + 1; // 1-based from left
    const weight3 = (n % 2 === 0 && pos % 2 === 0) || (n % 2 === 1 && pos % 2 === 1);
    sum += d * (weight3 ? 3 : 1);
  }
  const mod = sum % 10;
  return (10 - mod) % 10;
}

/**
 * Validate a full GTIN (8, 12, 13, 14 digits) including check digit.
 * @param {string} gtin
 * @returns {boolean}
 */
function isValidGTIN(gtin) {
  if (typeof gtin !== "string") return false;
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(gtin)) return false;
  const base = gtin.slice(0, gtin.length - 1);
  const cd = gtin.charCodeAt(gtin.length - 1) - 48;
  if (cd < 0 || cd > 9) return false;
  try {
    const expected = computeCheckDigit(base);
    return expected === cd;
  } catch {
    return false;
  }
}

/**
 * Optionally normalize a GTIN (pad left to 14) for indexing usage.
 * Do NOT use this to overwrite stored client value unless business requires.
 * @param {string} gtin
 * @returns {string}
 */
function normalizeGTIN14(gtin) {
  if (typeof gtin !== "string" || !/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(gtin)) {
    throw new Error("normalizeGTIN14: invalid GTIN");
  }
  return gtin.padStart(14, "0");
}

module.exports = {
  computeCheckDigit,
  isValidGTIN,
  normalizeGTIN14,
};