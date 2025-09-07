/**
 * @fileoverview Password hashing helpers.
 *
 * Responsibilities:
 *  - Provide abstraction over bcrypt so cost factor can be swapped centrally.
 *
 * Security:
 *  - Salt rounds fixed at 10 (adjust higher in production if latency acceptable).
 *  - Do not log raw passwords or hashes.
 *
 * Future:
 *  - Add Argon2 or scrypt alternative behind feature flag.
 */
const bcrypt = require("bcrypt");

async function hashPassword(plaintextPassword) {
  return bcrypt.hash(plaintextPassword, 10);
}

async function comparePassword(plaintextPassword, hash) {
  return bcrypt.compare(plaintextPassword, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};