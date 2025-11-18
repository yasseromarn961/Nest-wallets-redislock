const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const srcI18n = path.join(__dirname, '..', 'src', 'i18n');



const destSrc = path.join(__dirname, '..', 'dist/src', 'i18n');
// const destDist = path.join(__dirname, '..', 'dist', 'i18n');


copyDir(srcI18n, destSrc);
// copyDir(srcI18n, destDist);

console.log(`i18n files copied to: ${destSrc} `);
