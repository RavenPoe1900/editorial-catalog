/**
 * @fileoverview MongoDB (Mongoose) connection manager + dynamic model loader.
 *
 * Responsibilities:
 *  - Establish and maintain initial MongoDB connection.
 *  - Discover and require all Mongoose model definitions under any 'domain' folder (pattern-based).
 *  - Expose a safe disconnect method for graceful shutdowns.
 *
 * Design Decisions:
 *  - Synchronous model discovery during startup (acceptable: outside request path).
 *  - No connection pooling customization (Mongoose defaults suffice for most CRUD loads).
 *
 * Performance:
 *  - Model discovery uses naive recursion; fine for < few thousand files.
 *  - If repo size grows substantially -> switch to fast-glob or precomputed manifest.
 *
 * Reliability:
 *  - Process exits on initial connection failure (fail-fast principle for critical dependency).
 *
 * Security:
 *  - No dynamic code execution beyond requiring internal model files.
 *  - Ensure no untrusted write access to model directories in deployment environment.
 */
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const config = require("../config/config.js");
const { logger } = require("../utils/logger.js");

class MongooseDb {
  constructor() {
    this.mongoose = mongoose;
    this.models = {};
  }

  /**
   * Establish MongoDB connection using config.MONGODB.url.
   * FAIL-FAST: Exits process if connection fails (prevents app serving partial functionality).
   *
   * @throws {Error} If MONGO_URI is missing or connection rejects.
   */
  async connect() {
    const uri = config.MONGODB.url;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in configuration.");
    }
    try {
      await this.mongoose.connect(uri, {
        autoIndex: true,        // DEV convenience; disable in production if performance impacted.
        sanitizeFilter: true,   // SECURITY: Prevent operator injection in queries.
      });
      logger("Connected to MongoDB with Mongoose");
      this.loadModels();
    } catch (err) {
      console.error("Failed to connect to MongoDB with Mongoose", err);
      process.exit(1);
    }
  }

  /**
   * Discover all model schema files ending with ".schema.js" inside any 'domain' folder.
   * Pattern: src/**/domain/*.schema.js
   * SIDE EFFECT: Populates this.models as a registry for potential debugging.
   */
  loadModels() {
    const srcPath = path.resolve(__dirname, "../../");

    const findSchemas = (dir) => {
      const results = [];
      let list = [];
      try {
        list = fs.readdirSync(dir);
      } catch (e) {
        console.warn(`[ModelLoader] Cannot read directory: ${dir} -> ${e.message}`);
        return results;
      }

      list.forEach((entry) => {
        const full = path.resolve(dir, entry);
        let stat;
        try {
          stat = fs.statSync(full);
        } catch (e) {
          console.warn(`[ModelLoader] Cannot stat path: ${full} -> ${e.message}`);
          return;
        }

        if (stat.isDirectory()) {
          if (path.basename(full) === "domain") {
            // Inspect only direct files inside this 'domain' folder.
            let domainFiles = [];
            try {
              domainFiles = fs.readdirSync(full);
            } catch (e) {
              console.warn(`[ModelLoader] Cannot read domain folder: ${full}`);
            }
            domainFiles.forEach((f) => {
              const schemaPath = path.resolve(full, f);
              if (
                fs.existsSync(schemaPath) &&
                fs.statSync(schemaPath).isFile() &&
                f.endsWith(".schema.js")
              ) {
                results.push(schemaPath);
              }
            });
          } else {
            // Recurse into other directories.
            results.push(...findSchemas(full));
          }
        }
      });
      return results;
    };

    try {
      const schemaFiles = findSchemas(srcPath);
      schemaFiles.forEach((file) => {
        const modelName = path.basename(file, ".schema.js");
        // REQUIRE CONTRACT: Each file must export a compiled Mongoose model.
        this.models[modelName] = require(file);
      });
    } catch (err) {
      console.error("Failed to load models", err);
    }
  }

  /**
   * Gracefully close the current Mongoose connection.
   * Use this for shutdown hooks (SIGINT / SIGTERM).
   */
  async disconnect() {
    try {
      await this.mongoose.disconnect();
      console.log("Disconnected from MongoDB with Mongoose");
    } catch (err) {
      console.error("Failed to disconnect from MongoDB with Mongoose", err);
    }
  }
}

module.exports = MongooseDb;