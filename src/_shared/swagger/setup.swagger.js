// _shared/swagger/setup.swagger.js
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const findRoutes = require("../service/findRote.service.js");

const routes = findRoutes(
  path.resolve(__dirname, "../../"),
  "domain",
  ".swagger.js"
);

function setupSwagger(app, port) {
  const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API documentation",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Development" },
      { url: "https://staging.api.example.com", description: "Staging" },
      { url: "https://api.example.com", description: "Production" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Usar: Bearer <access_token>",
        },
        refreshCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description:
            "Refresh token enviado vía cookie HttpOnly llamada `refreshToken`. Swagger no puede crear cookies HttpOnly; ver descripción del endpoint.",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Autenticación y gestión de tokens" },
      { name: "Users", description: "Usuarios y perfiles" },
      { name: "Health", description: "Health checks y estado del sistema" },
    ],
    // Opcional: si quieres requerir bearer por defecto para todas las rutas:
    // security: [{ bearerAuth: [] }],
  };

  const swaggerOptions = {
    swaggerDefinition,
    apis: routes, // tus archivos .swagger.js ya existentes
  };

  const specs = swaggerJsdoc(swaggerOptions);

  const swaggerUiOptions = {
    swaggerOptions: {
      persistAuthorization: true, // permite persistir el token ingresado en "Authorize"
      displayRequestDuration: true,
      docExpansion: "none",
      // Para que Swagger UI incluya cookies (importante para /auth/refresh)
      requestInterceptor: (req) => {
        req.credentials = "include";
        return req;
      },
    },
    customSiteTitle: "My API Docs",
  };

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
}

module.exports = setupSwagger;