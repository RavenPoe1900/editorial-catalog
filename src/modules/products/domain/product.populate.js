/**
 * Populate configuration for Product documents.
 * - createdBy: attach minimal user info for auditing and UI display.
 */
module.exports = [
  {
    path: "createdBy",
    model: "User",
    select: "email name role",
    options: { lean: true },
  },
];