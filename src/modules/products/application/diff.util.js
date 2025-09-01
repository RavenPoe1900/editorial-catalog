/**
 * Compute a shallow diff between the current product and the attempted updates,
 * restricted to business fields we want to audit (no metadata).
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
 * Pick a subset of fields from an object.
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
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
 * Compute previous/new snapshots for only the fields that are going to change.
 * @param {object} currentDoc - Current DB document (Mongoose doc or plain)
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