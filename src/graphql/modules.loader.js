// graphql/modules.loader.js
// Auto-discovers GraphQL modules strictly under "src/**/graphql" folders.
// It loads:
// - SDL files: src/**/graphql/*.typeDefs.graphql
// - Resolvers: src/**/graphql/*.resolvers.js
//
// Notes:
// - Ignores node_modules, build outputs and VCS directories.
// - Returns aggregated SDL array and a merged resolvers map.
// - Keep it simple and deterministic (no external config needed).

const fs = require("fs");
const fg = require("fast-glob");
const path = require("path");

/**
 * Read a UTF-8 text file.
 * @param {string} filePath Absolute path to the file
 * @returns {string} File contents as UTF-8 string
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Deep-merge resolver maps of shape:
 * { Query: {...}, Mutation: {...}, TypeName: {...} }
 * @param {Record<string, any>} target Destination map
 * @param {Record<string, any>} source Source map
 * @returns {Record<string, any>} Merged map
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
 * Auto-discover SDL (*.typeDefs.graphql) and resolvers (*.resolvers.js)
 * strictly inside "src/../graphql directories.
 * @param {string} rootDir Project root directory (default: process.cwd())
 * @returns {Promise<{ moduleTypeDefs: string[], resolvers: Record<string, any> }>}
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

  // Limit discovery to src/**/graphql folders
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
    // Clear module cache to support dev reloads with nodemon
    delete require.cache[require.resolve(file)];
    const mod = require(file);
    deepMergeResolvers(resolvers, mod);
  }

  return { moduleTypeDefs, resolvers };
}

module.exports = { loadModuleTypeDefsAndResolvers };