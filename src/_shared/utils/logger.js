const chalk = require("chalk").default;
const url = require("../config/config.js").URL;

const logger = (text, info = "INFO:", color = "green") => {
  const dateTime = new Date().toJSON().slice(0, 19).replace("T", ":");

  console.log(
    ` ${chalk["green"]("[express]")} ${chalk.yellow(`[${dateTime}]`)} ${chalk[color](info)} ${chalk.bgBlue(text)}`
  );
};

const printEndpoints = (path, method) => {
  logger(`[RouterExplorer] Mapped {${path}, ${method}} route`, "INFO:", "green");
};

module.exports = { logger, printEndpoints };