/**
 * @fileoverview GTIN utility helpers (compute + validate + normalize).
 *
 * Supported:
 *  - GTIN-8, 12, 13, 14 (variable base length + check digit logic).
 *
 * Performance:
 *  - Light loops; negligible overhead in typical API usage.
 *
 * Future:
 *  - Add canonicalization warnings or formatting functions.
 */
function computeCheckDigit(base) {
  if (!/^\d+$/.test(base)) {
    throw new Error("computeCheckDigit: base must be numeric");
  }
  const n = base.length;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = base.charCodeAt(i) - 48;
    const pos = i + 1;
    const weight3 =
      (n % 2 === 0 && pos % 2 === 0) || (n % 2 === 1 && pos % 2 === 1);
    sum += d * (weight3 ? 3 : 1);
  }
  const mod = sum % 10;
  return (10 - mod) % 10;
}

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

function normalizeGTIN14(gtin) {
  if (
    typeof gtin !== "string" ||
    !/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(gtin)
  ) {
    throw new Error("normalizeGTIN14: invalid GTIN");
  }
  return gtin.padStart(14, "0");
}

module.exports = {
  computeCheckDigit,
  isValidGTIN,
  normalizeGTIN14,
};