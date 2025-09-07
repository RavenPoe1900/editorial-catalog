/**
 * @fileoverview Utilities to compute shallow diffs for product updates.
 *
 * Responsibilities:
 *  - Identify which business fields are changing.
 *  - Produce previous/next snapshots only when a real change occurs.
 *
 * Limitations:
 *  - Shallow comparison; nested objects compared via JSON.stringify equality.
 *  - Not suitable for very large nested documents (performance).
 *
 * Future:
 *  - Introduce deep diff with field-level change descriptors.
 *  - Expose list of changed field names explicitly.
 */

/**
 * Fields considered as business-relevant for auditing.
 */
const BUSINESS_FIELDS = [
  "gtin",
  "name",
  "description",
  "brand",
  "manufacturer",
  "netWeight",
  "weightUnit",
  "status",
];

/**
 * Pick subset of keys from object (no deep clone).
 * @param {object} obj
 * @param {string[]} keys
 */
function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj != null && Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  }
  return out;
}

/**
 * Compute audit snapshots for fields that changed.
 *
 * @param {object} currentDoc - Existing product document (Mongoose doc or plain object)
 * @param {object} updates - Partial update payload
 * @returns {{previous: object, next: object}}
 */
function computeAuditDiff(currentDoc, updates) {
  const source = currentDoc?.toObject?.() ? currentDoc.toObject() : currentDoc;
  const prevSnapshot = pick(source, BUSINESS_FIELDS);
  const nextSnapshot = { ...prevSnapshot };

  let touched = false;

  for (const key of BUSINESS_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      nextSnapshot[key] = updates[key];
      if (JSON.stringify(prevSnapshot[key]) !== JSON.stringify(updates[key])) {
        touched = true;
      }
    }
  }

  if (!touched) {
    return { previous: {}, next: {} };
  }
  return { previous: prevSnapshot, next: nextSnapshot };
}

module.exports = {
  BUSINESS_FIELDS,
  pick,
  computeAuditDiff,
};