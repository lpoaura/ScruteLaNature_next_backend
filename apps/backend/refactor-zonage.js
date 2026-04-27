const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (
        dirFile.endsWith('.ts') ||
        dirFile.endsWith('.prisma') ||
        dirFile.endsWith('.md')
      ) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const replaceInFiles = () => {
  const files = walkSync(path.join(__dirname));
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remplacements stricts et prudents
    let newContent = content
      .replace(/communeId/g, 'zonageId')
      .replace(/communes/g, 'zonages')
      .replace(/Communes/g, 'Zonages')
      .replace(/commune/g, 'zonage')
      .replace(/Commune/g, 'Zonage');

    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
};

replaceInFiles();
