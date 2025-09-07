/**
 * @fileoverview Swagger (OpenAPI) setup.
 *
 * Responsibilities:
 *  - Generate OpenAPI spec from JSDoc-style annotations (*.swagger.js) discovered under any domain folder.
 *  - Serve interactive documentation via swagger-ui-express at /api-docs.
 *
 * Design Choices:
 *  - JSDoc scanning via custom route discovery (findRoutes on ".swagger.js").
 *  - Custom bearer + refreshCookieAuth security schemes.
 *
 * Security:
 *  - Do not expose operational or internal admin endpoints unless intentionally documented.
 *
 * Future:
 *  - Add versioning (e.g., /v1 vs /v2).
 *  - Add OpenAPI JSON export route (/openapi.json).
 */
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
          description: "Use: Bearer <access_token>",
        },
        refreshCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description:
            "Refresh token sent via HttpOnly cookie named `refreshToken`. Not directly settable via Swagger UI.",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication and token management" },
      { name: "Users", description: "User CRUD and profile operations" },
      { name: "Health", description: "Health checks" },
    ],
  };

  const swaggerOptions = {
    swaggerDefinition,
    apis: routes,
  };

  const specs = swaggerJsdoc(swaggerOptions);

  const swaggerUiOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
      requestInterceptor: (req) => {
        // Include cookies (e.g., for refresh token flows)
        req.credentials = "include";
        return req;
      },
    },
    customSiteTitle: "My API Docs",
  };

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
}

module.exports = setupSwagger;