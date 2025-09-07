/**
 * @fileoverview Dynamic REST route auto-registration.
 *
 * Responsibilities:
 *  - Discover route definition files that follow the "<name>.routers.js" naming convention
 *    inside any "infrastructure" folder under the source tree.
 *  - Derive a base path from the file name and mount under /api/<routeName>.
 *  - Emit structured logs for each mapped route + method for observability.
 *
 * Naming Convention:
 *  modules/<feature>/infrastructure/<feature>.routers.js
 *  Will be mounted at: /api/<feature>
 *
 * Non-Goals:
 *  - No hot reloading. For dev dynamic watch, integrate with nodemon/tsx.
 *  - No validation of router contents beyond basic shape check.
 *
 * SECURITY:
 *  - Only internal code should live in 'infrastructure'; if user-uploaded scripts appear here, it's a supply chain risk.
 *
 * EXTENSION:
 *  - Add caching or signature hashing if startup performance degrades with many modules.
 */
const path = require("path");
const findRoutes = require("../service/findRote.service.js");
const express = require("express");
const { printEndpoints } = require("../utils/logger.js");

/**
 * Build and attach discovered route modules to /api.
 * @param {import('express').Express} app
 * @returns {import('express').Express}
 */
function setupRoot(app) {
  const mainRouter = express.Router();

  // Anchor root: resolved to source root (../../ from _shared/root/)
  const routes = findRoutes(
    path.resolve(__dirname, "../../"),
    "infrastructure",
    ".routers.js"
  );

  routes.forEach((routePath) => {
    try {
      // Dynamic load of router. SAFE: Only internal code repo included.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(routePath);
      const route = mod.default || mod;

      if (typeof route !== "function") {
        console.warn(`[RouteLoader] Skipped (not an Express router): ${routePath}`);
        return;
      }

      // Route name derived from filename (e.g. product.routers.js -> 'product')
      const baseName = path.basename(routePath);
      const routeName = baseName.replace(/\.routers?\.js$/i, "").split(".")[0];
      const mountBase = `/api/${routeName}`;

      // Mount logical router
      mainRouter.use(`/${routeName}`, route);

      // Introspect router stack to print endpoints for developer UX
      if (route.stack) {
        route.stack.forEach((layer) => {
          if (layer.route) {
            const fullPath = mountBase + layer.route.path;
            const methods = Object.keys(layer.route.methods).map((m) =>
              m.toUpperCase()
            );
            printEndpoints(fullPath, methods.join(","));
          } else if (layer.name === "router") {
            console.log(
              `[RouteLoader] Nested router found under /${routeName} (depth>1).`
            );
          }
        });
      }
    } catch (err) {
      console.error(`[RouteLoader] Failed loading ${routePath}:`, err);
    }
  });

  app.use("/api", mainRouter);
  return app;
}

module.exports = setupRoot;