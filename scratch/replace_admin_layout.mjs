import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/O2W ADMIN/g, 'UPSHERU ADMIN');
  fs.writeFileSync(fullPath, content, 'utf8');
}

replaceInFile('src/app/(admin)/layout.tsx');
console.log('Replaced text in admin layout');
