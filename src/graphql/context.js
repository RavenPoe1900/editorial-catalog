const jwt = require("jsonwebtoken");
const config = require("../_shared/config/config");

/**
 * Construye el contexto por request para GraphQL.
 * - Extrae el Authorization token desde diferentes formas de request (graphql-http, Express).
 * - No rompe si falta o es inválido; devuelve user = null y la directiva @auth protege campos/ops.
 */
module.exports.buildContext = async (contextInput) => {
  // Normaliza el objeto interno de request que puede venir de distintos adaptadores:
  // - En graphql-http/use/express: la request del handler tiene { headers, raw, ... }
  // - En Express: es el req clásico con .get() / .header() / .headers
  const reqWrapper = contextInput?.req || contextInput || {};
  const req = reqWrapper.raw || reqWrapper;

  // Helper para leer el header Authorization de forma tolerante
  const readAuthHeader = () => {
    try {
      // Preferimos métodos si existen (Express)
      if (req && typeof req.get === "function") {
        return req.get("authorization") || req.get("Authorization");
      }
      if (req && typeof req.header === "function") {
        return req.header("authorization") || req.header("Authorization");
      }
      // graphql-http wrapper u objetos planos
      if (reqWrapper && reqWrapper.headers) {
        return reqWrapper.headers["authorization"] || reqWrapper.headers["Authorization"];
      }
      if (req && req.headers) {
        return req.headers["authorization"] || req.headers["Authorization"];
      }
    } catch (_e) {
      // Ignorar errores de lectura de headers
    }
    return null;
  };

  const header = readAuthHeader();
  let user = null;

  if (header) {
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT.key);
        const { userId, role } = decoded || {};
        if (userId) {
          user = {
            userId,
            role: role || null,
            roles: role ? [role] : [],
          };
        }
      } catch (err) {
        // Token inválido/expirado: se registra a nivel debug y continúa como anónimo
        // console.log(`[Auth] Token inválido ignorado: ${err.message}`);
      }
    }
  }

  // Retornar ambos objetos por conveniencia
  return { req: req, rawReq: reqWrapper.raw || null, user };
};