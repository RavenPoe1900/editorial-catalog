/**
 * @fileoverview GraphQL module auto-loader.
 *
 * Responsibilities:
 *  - Discover SDL (*.typeDefs.graphql) and resolver files (*.resolvers.js) under src//graphql.
 *  - Merge all resolvers into a single resolver map.
 *  - Return arrays of type definitions for schema assembly.
 *
 * Design Choices:
 *  - fast-glob used for performance and flexibility.
 *  - Cache bust (delete require.cache) to support dev-time reload with nodemon.
 *
 * Non-Goals:
 *  - No circular dependency detection.
 *  - No schema validation here (handled by GraphQL build process).
 *
 * Performance:
 *  - Single pass at startup; acceptable overhead.
 *
 * Future:
 *  - Add optional module manifest for production deterministic loading.
 *  - Add hashing to detect changes and skip reloads.
 */
const fs = require("fs");
const fg = require("fast-glob");
const path = require("path");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Deep merge resolver maps.
 * Strategy: object property overwrite — last writer wins for conflicts.
 */
function deepMergeResolvers(target, source) {
  for (const key of Object.keys(source || {})) {
    const val = source[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      target[key] = target[key] || {};
      deepMergeResolvers(target[key], val);
    } else {
      target[key] = val;
    }
  }
  return target;
}

/**
 * Discover GraphQL module artifacts.
 * @param {string} rootDir
 * @returns {Promise<{ moduleTypeDefs: string[], resolvers: Record<string,any> }>}
 */
async function loadModuleTypeDefsAndResolvers(rootDir = process.cwd()) {
  const ignore = [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.next/**",
    "**/.turbo/**",
  ];

  const typeDefFiles = await fg(["src/**/graphql/*.typeDefs.graphql"], {
    cwd: rootDir,
    ignore,
    absolute: true,
  });

  const resolverFiles = await fg(["src/**/graphql/*.resolvers.js"], {
    cwd: rootDir,
    ignore,
    absolute: true,
  });

  const moduleTypeDefs = typeDefFiles.map(readText);

  const resolvers = {};
  for (const file of resolverFiles) {
    delete require.cache[require.resolve(file)];
    const mod = require(file);
    deepMergeResolvers(resolvers, mod);
  }

  return { moduleTypeDefs, resolvers };
}

module.exports = { loadModuleTypeDefsAndResolvers };