/**
 * @fileoverview Central logging utilities.
 *
 * Responsibilities:
 *  - Provide a consistent, minimal abstraction over console logging.
 *  - Standardize color formatting and prefix structure.
 *  - Offer helpers for "endpoint mapping" logs to unify service + GraphQL style.
 *
 * Design Choices:
 *  - Intentionally thin: no global state, no external transports (e.g., Winston, Pino).
 *  - Console-based to keep local dev friction low. Swap out later behind same API if needed.
 *
 * Non-Goals:
 *  - Does not implement structured JSON logging (could be added for production ingestion).
 *  - Does not implement log levels with filtering (logger always logs).
 *
 * Future:
 *  - Introduce LOG_LEVEL env and drop logs below threshold.
 *  - Add correlation IDs / request IDs for tracing across async boundaries.
 */
const chalk = require("chalk").default;

/**
 * Core logger function.
 *
 * SECURITY: Never log secrets / raw tokens. Callers must sanitize inputs.
 * PERFORMANCE: String formatting is minimal; acceptable for typical API loads.
 *
 * @param {string} text - Main message body.
 * @param {string} info - Category or tag (e.g., 'INFO:', 'ERROR:', etc.)
 * @param {keyof typeof chalk} color - Chalk color name (fallback handled implicitly).
 */
const logger = (text, info = "INFO:", color = "green") => {
  const dateTime = new Date().toJSON().slice(0, 19).replace("T", ":");
  // Format stays intentionally stable for log parsing if needed later.
  console.log(
    ` ${chalk.green("[express]")} ${chalk.yellow(
      `[${dateTime}]`
    )} ${chalk[color](info)} ${chalk.bgBlue(text)}`
  );
};

/**
 * Log a high-level logical endpoint mapping (GraphQL or REST).
 *
 * @param {string} label - Module / entity / conceptual owner.
 * @param {string} method - Logical method descriptor (QUERY / MUTATION / GET / POST, etc.)
 */
const printEndpoints = (label, method) => {
  logger(
    `[RouterExplorer] Mapped  ${label} {${method}} route`,
    "INFO:",
    "green"
  );
};

/**
 * Log a granular operation within a logical module.
 *
 * @param {string} moduleLabel - e.g. 'Product'
 * @param {string} operationName - e.g. 'createProduct'
 * @param {string} method - Method semantics (QUERY | MUTATION | GET | etc.)
 */
const printEndpointDetail = (moduleLabel, operationName, method) => {
  logger(
    `[RouterExplorer] Mapped  ${moduleLabel}.${operationName} {${method}} route`,
    "INFO:",
    "green"
  );
};

module.exports = { logger, printEndpoints, printEndpointDetail };