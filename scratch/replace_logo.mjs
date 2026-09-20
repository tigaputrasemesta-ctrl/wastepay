import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/O₂W HERO/g, 'UPSHERU');
  // There is also "O₂W" in "GABUNG O₂W SEKARANG"
  content = content.replace(/O₂W/g, 'UPSHERU');
  fs.writeFileSync(fullPath, content, 'utf8');
}

replaceInFile('src/app/page.tsx');
replaceInFile('src/app/(public)/layout.tsx');
replaceInFile('src/app/(public)/unduh/page.tsx');
console.log('Replaced O₂W HERO with UPSHERU safely');
