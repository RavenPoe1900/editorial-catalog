const chalk = require("chalk").default;

/**
 * Generic application logger used in several places.
 * Keeps original format/color coding for backward compatibility.
 * @param {string} text - Message to print
 * @param {string} info - Level label (e.g., "INFO:", "ERROR:")
 * @param {keyof typeof chalk} color - Chalk color name for the level label
 */
const logger = (text, info = "INFO:", color = "green") => {
  const dateTime = new Date().toJSON().slice(0, 19).replace("T", ":");
  console.log(
    ` ${chalk.green("[express]")} ${chalk.yellow(`[${dateTime}]`)} ${chalk[color](
      info
    )} ${chalk.bgBlue(text)}`
  );
};

/**
 * Internal state for Nest-like route mapping logs to compute "+Xms" deltas.
 */
let __prevHr = null;

/**
 * Format current date/time as "DD/MM/YYYY, HH:MM:SS" to resemble Nest default.
 * @returns {string}
 */
function formatDateNest() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

/**
 * Print a concise, Nest-like mapped route line with colors.
 * Example:
 * [Nest] 12345  - 31/08/2025, 22:00:15     LOG [RouterExplorer] Mapped {/graphql/query/users, QUERY} route +0ms
 *
 * - Uses chalk for colored sections.
 * - Shows PID, timestamp, component, and "+Xms" since previous mapping print.
 *
 * @param {string} path - Synthetic path to display (e.g., "/graphql/query/users")
 * @param {string} method - Operation kind (e.g., "QUERY", "MUTATION")
 */
const printEndpoints = (path, method) => {
  const pid = process.pid;
  const now = process.hrtime.bigint();
  if (!__prevHr) __prevHr = now;
  const deltaMs = Number(now - __prevHr) / 1e6;
  __prevHr = now;

  const prefix =
    `${chalk.cyan("[Nest]")} ` +
    `${chalk.yellow(pid)}  - ` +
    `${chalk.yellow(formatDateNest())}     ` +
    `${chalk.green("LOG")} `;

  const body =
    `${chalk.cyan("[RouterExplorer]")} ` +
    `${chalk.green("Mapped")} ` +
    `{${chalk.blue(path)}, ${chalk.magenta(method)}} ` +
    `${chalk.green("route")} ` +
    `${chalk.gray(`+${Math.round(deltaMs)}ms`)}`;

  console.log(`${prefix}${body}`);
};

module.exports = { logger, printEndpoints };