const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const config = require("../config/config.js"); // Ajusta el path según tu estructura
const { logger } = require("../utils/logger.js");

class MongooseDb {
  constructor() {
    this.mongoose = mongoose;
    this.models = {};
  }

  async connect() {
    const uri = config.MONGODB.url; // Usa la URL de MongoDB desde el archivo de configuración
    if (!uri) {
      throw new Error("MONGO_URI is not defined in configuration.");
    }
    try {
      await this.mongoose.connect(uri, {
        // Las opciones useNewUrlParser y useUnifiedTopology han sido eliminadas
        // ya que están obsoletas desde la versión 4.0.0 del driver
        autoIndex: true,
        sanitizeFilter: true,
      });
      logger("Connected to MongoDB with Mongoose");
      this.loadModels(); // Carga los modelos despues de la coneccion
    } catch (err) {
      console.error("Failed to connect to MongoDB with Mongoose", err);
      process.exit(1);
    }
  }

  loadModels() {
    const srcPath = path.resolve(__dirname, "../../");
    const findSchemas = (dir) => {
      const results = [];

      // Leer todos los elementos en el directorio actual
      const list = fs.readdirSync(dir);

      // Iterar sobre los elementos
      list.forEach((file) => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);

        if (stat && stat.isDirectory()) {
          // Si el directorio se llama 'domain', buscar archivos .schema.js dentro de él
          if (path.basename(file) === "domain") {
            const domainList = fs.readdirSync(file);
            domainList.forEach((domainFile) => {
              const domainPath = path.resolve(file, domainFile);
              if (
                fs.statSync(domainPath).isFile() &&
                domainFile.endsWith(".schema.js")
              ) {
                results.push(domainPath);
              }
            });
          } else {
            // Continuar la búsqueda en subdirectorios
            results.push(...findSchemas(file));
          }
        }
      });

      return results;
    };

    try {
      const schemaFiles = findSchemas(srcPath);
      schemaFiles.forEach((file) => {
        const modelName = path.basename(file, ".schema.js");
        // Ensure that each model file exports a Mongoose model
        this.models[modelName] = require(file);
      });
    } catch (err) {
      console.error("Failed to load models", err);
    }
  }

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