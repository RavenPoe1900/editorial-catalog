/**
 * @fileoverview Generic type enumeration (could represent test phases or evaluation types).
 *
 * Values:
 *  - partial, final, test
 *
 * Clarify:
 *  - Consider renaming file to something more domain-specific if context grows.
 */
const TypeTypeEnum = Object.freeze({
  PARTIAL: "partial",
  FINAL: "final",
  TEST: "test",
});

module.exports = TypeTypeEnum;