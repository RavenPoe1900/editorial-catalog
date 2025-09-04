console.log("INICIANDO: Cargando módulos principales...");

const http = require('http');
const express = require("express");
const MongoDb = require("./_shared/db/mongoConnect.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./_shared/config/config.js");
const { logger } = require("./_shared/utils/logger.js");
const errorHandler = require("./_shared/middlewares/errorHandle.middleware.js");

// Cargadores de lógica de negocio y GraphQL
const { setupGraphQL } = require("./graphql/index");
const { ensureEmployeeRole } = require("./_shared/dataInitializer/role.dataInitializer.js");
const { ensureSearchAndBus } = require("./_shared/dataInitializer/searchAndBus.initializer");
const { registerCleanupJob } = require("./_shared/jobs/refreshTokenCleanup.job");

const PORT = config.PORT || 3015;

/**
 * Función principal que arranca la aplicación.
 * Sigue un flujo estricto:
 * 1. Conectar dependencias críticas (DB).
 * 2. Crear y configurar la app Express.
 * 3. Iniciar tareas de fondo (no bloqueantes).
 * 4. Crear el servidor HTTP y empezar a escuchar.
 */
async function main() {
  console.log("MAIN: Iniciando secuencia de arranque...");

  // --- 1. CONECTAR DEPENDENCIAS CRÍTICAS ---
  try {
    console.log("MAIN: Conectando a MongoDB...");
    const mongoDb = new MongoDb();
    await mongoDb.connect();
    console.log("MAIN: Conexión a MongoDB exitosa.");
  } catch (dbError) {
    console.error("ERROR FATAL: No se pudo conectar a la base de datos.", dbError);
    process.exit(1); // Salir si la DB no está disponible
  }

  // --- 2. CREAR Y CONFIGURAR LA APP EXPRESS ---
  const app = express();
  console.log("MAIN: Instancia de Express creada.");

  // Middlewares esenciales (se aplican en orden)
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: false }));
  
  // Endpoint de diagnóstico vital
  app.get("/_health", (req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Configurar GraphQL. La función ahora solo adjunta las rutas a la app.
  console.log("MAIN: Configurando GraphQL...");
  await setupGraphQL(app); // Esperamos a que el schema se construya
  console.log("MAIN: GraphQL configurado y rutas adjuntas.");

  // Middleware de manejo de errores (debe ir al final)
  app.use(errorHandler);
  console.log("MAIN: Middleware de errores final registrado.");

  // --- 3. INICIAR TAREAS DE FONDO ---
  // Estas tareas se inician pero no bloquean el arranque del servidor.
  ensureEmployeeRole().catch(err => console.error("Error en la inicialización de roles:", err));
  ensureSearchAndBus().catch(err => console.error("Error en la inicialización de Search/Bus:", err));
  registerCleanupJob();
  console.log("MAIN: Tareas de fondo iniciadas.");

  // --- 4. CREAR SERVIDOR HTTP Y ESCUCHAR ---
  const server = http.createServer(app);
  console.log("MAIN: Servidor HTTP creado.");

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR FATAL: El puerto ${PORT} ya está en uso.`);
      process.exit(1);
    } else {
      console.error("Error en el servidor HTTP:", err);
    }
  });

  server.listen(PORT, () => {
    console.log("=====================================================");
    console.log(`🚀 SERVIDOR LISTO Y ESCUCHANDO EN EL PUERTO ${PORT}`);
    console.log(`✅ Endpoint de salud: http://localhost:${PORT}/_health`);
    console.log(`✅ Playground de GraphQL: http://localhost:${PORT}/graphiql`);
    console.log("=====================================================");
    logger(`Servidor iniciado en modo: ${process.env.NODE_ENV || 'development'}`);
  });
}

// --- PUNTO DE ENTRADA ---
// Captura de errores globales para mayor estabilidad.
process.on('unhandledRejection', (reason, promise) => {
  console.error('ERROR GRAVE: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('ERROR GRAVE: Uncaught Exception:', error);
});

// Arrancar la aplicación.
main();