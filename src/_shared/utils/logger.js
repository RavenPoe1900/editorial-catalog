const chalk = require("chalk").default;

/**
 * Generic application logger used across the app.
 * Unified Express-style format with colors:
 *  [express] [YYYY-MM-DD:HH:MM:SS] INFO: <message>
 */
const logger = (text, info = "INFO:", color = "green") => {
  const dateTime = new Date().toJSON().slice(0, 19).replace("T", ":");
  console.log(
    ` ${chalk.green("[express]")} ${chalk.yellow(
      `[${dateTime}]`
    )} ${chalk[color](info)} ${chalk.bgBlue(text)}`
  );
};

/**
 * Module-level mapped route line (Express-style).
 * Example:
 *  [express] [2025-09-01:03:02:30] INFO: [RouterExplorer] Mapped  Product {QUERY} route
 *
 * label: owner/entity of the operation (e.g., Role, User, Product, Auth)
 * method: QUERY | MUTATION
 */
const printEndpoints = (label, method) => {
  logger(
    `[RouterExplorer] Mapped  ${label} {${method}} route`,
    "INFO:",
    "green"
  );
};

/**
 * Operation-level mapped route detail (Express-style).
 * Example:
 *  [express] [2025-09-01:03:02:30] INFO: [RouterExplorer] Mapped  Product.createProduct {MUTATION} route
 *
 * moduleLabel: e.g., "Product"
 * operationName: e.g., "createProduct"
 * method: QUERY | MUTATION
 */
const printEndpointDetail = (moduleLabel, operationName, method) => {
  logger(
    `[RouterExplorer] Mapped  ${moduleLabel}.${operationName} {${method}} route`,
    "INFO:",
    "green"
  );
};

module.exports = { logger, printEndpoints, printEndpointDetail };