const path = require("path");
const findRoutes = require("../service/findRote.service.js");
const express = require("express");
const { printEndpoints } = require("../utils/logger.js");

function setupRoot(app) {
  const mainRouter = express.Router();

  const routes = findRoutes(
    path.resolve(__dirname, "../../"),
    "infrastructure",
    ".routers.js"
  );

  routes.forEach((routePath) => {
    try {
      const mod = require(routePath);
      const route = mod.default || mod;

      if (typeof route !== "function") {
        console.warn(`[Logger] Ruta ignorada (no es un router): ${routePath}`);
        return;
      }

      const baseName = path.basename(routePath);
      const routeName = baseName.replace(/\.routers?\.js$/i, "").split(".")[0];
      const basePath = `/api/${routeName}`;

      // Montar el router
      mainRouter.use(`/${routeName}`, route);

      // 🔍 Extraer y mostrar las rutas y métodos del router
      if (route.stack) {
        route.stack.forEach((layer) => {
          if (layer.route) {
            // Ruta con método específico (GET, POST, etc.)
            const fullPath = basePath + layer.route.path;
            const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
            printEndpoints(fullPath, methods);
          } else if (layer.name === "router") {
            // Caso anidado: sub-routers (menos común, pero manejado)
            console.log(`[RouterExplorer] Router anidado detectado en /${routeName}, revisa si necesitas más profundidad.`);
          }
        });
      }
    } catch (err) {
      console.error(`Error al cargar ruta ${routePath}:`, err);
    }
  });

  // Montar todo bajo /api
  app.use("/api", mainRouter);

  return app;
}

module.exports = setupRoot;