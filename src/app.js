const express = require("express");
const app = express();
const MongoDb = require("./_shared/db/mongoConnect.js");
const mongoDb = new MongoDb();
const cors = require("cors");
const { logger } = require("./_shared/utils/logger.js");
const cookieParser = require("cookie-parser");
const errorHandler = require("./_shared/middlewares/errorHandle.middleware.js");
const config = require("./_shared/config/config.js");
const setupSwagger = require("./_shared/swagger/setup.swagger.js");
const setupRoot = require("./_shared/root/setup.root.js");
const {
  ensureEmployeeRole,
} = require("./_shared/dataInitializer/role.dataInitializer.js");
const jsonSyntaxErrorHandler = require("./_shared/middlewares/validate/json.validate.js");
const mongoSanitize = require("./_shared/middlewares/mongoSanitize.middleware.js");
const { registerCleanupJob } = require('./_shared/jobs/refreshTokenCleanup.job');

const port = config.PORT;

app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true, // en prod indicar lista/DOMINIOS
  credentials: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(jsonSyntaxErrorHandler);
app.use(mongoSanitize)

async function init() {
  try {
    await mongoDb.connect();
    setupRoot(app);
    setupSwagger(app, port);

    await ensureEmployeeRole();
    registerCleanupJob();

    app.use(errorHandler);

    app.listen(port, () => {
      logger(`Server is running in port:${port}`);
    });
  } catch (err) {
    console.error("Failed to initialize app:", err);
    process.exit(1);
  }
}

init();

module.exports = app;