/**
 * @fileoverview Enumeration for question types (quiz / assessment domain).
 *
 * Values:
 *  - multiple-choice
 *  - true-false
 *  - short-answer
 *
 * NOTE:
 *  - Not currently integrated with other shown modules; ensure usage aligns with domain naming.
 */
const QuestionTypeEnum = Object.freeze({
  MULTIPLE_CHOICE: 'multiple-choice',
  TRUE_FALSE: 'true-false',
  SHORT_ANSWER: 'short-answer'
});

module.exports = QuestionTypeEnum;