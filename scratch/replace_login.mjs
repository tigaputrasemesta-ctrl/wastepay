import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/O2W \/ LOGIN ADMIN/g, 'UPSHERU / LOGIN ADMIN');
  content = content.replace(/O2W HERO DEPOK/g, 'UPSHERU DEPOK');
  content = content.replace(/O₂W Lapangan/g, 'UPSHERU Lapangan');
  fs.writeFileSync(fullPath, content, 'utf8');
}

replaceInFile('src/app/login/page.tsx');
try {
  replaceInFile('src/app/m/layout.tsx');
} catch (e) {}

console.log('Replaced text in login and mobile layout');
