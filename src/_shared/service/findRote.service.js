/**
 * @fileoverview Recursive route discovery (original minimal variant).
 *
 * NOTE:
 *  - There is an enhanced version elsewhere; retain this only if other components still import it.
 *  - Consider merging with enhanced findRoutes for consistency.
 *
 * Behavior:
 *  - Scans for directories matching folderName.
 *  - Inside those, collects files ending with fileName (exact suffix).
 *
 * Limitations:
 *  - Synchronous FS operations (acceptable at startup).
 *  - No glob support, no caching, no error escalation.
 */
const fs = require("fs");
const path = require("path");

const findRoutes = (dir, folderName, fileName) => {
  const results = [];

  const exploreDirectory = (currentDir) => {
    try {
      const list = fs.readdirSync(currentDir);
      list.forEach((file) => {
        const filePath = path.resolve(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file === folderName) {
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