const fs = require("fs");
const path = require("path");

const findRoutes = (dir, folderName, fileName) => {
  const results = [];

  // Función recursiva para explorar directorios
  const exploreDirectory = (currentDir) => {
    try {
      const list = fs.readdirSync(currentDir);
      list.forEach((file) => {
        const filePath = path.resolve(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file === folderName) {
            // Buscar archivos .route.js en la carpeta 'infrastructure'
            const infraFiles = fs.readdirSync(filePath);
            infraFiles.forEach((infraFile) => {
              if (infraFile.endsWith(fileName)) {
                results.push(path.resolve(filePath, infraFile));
              }
            });
          } else {
            exploreDirectory(filePath);
          }
        }
      });
    } catch (err) {
      console.error(`Error reading directory ${currentDir}:`, err);
    }
  };

  exploreDirectory(dir);
  return results;
};

module.exports = findRoutes;
