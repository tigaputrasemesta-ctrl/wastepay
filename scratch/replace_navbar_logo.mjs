import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace the navbar logo
  content = content.replace(/<AnimatedDumpTruck size="md" theme="green" \/>[\s\S]*?<span className="text-3xl font-black tracking-tighter">UPSHERU\.<\/span>/, 
  `<img src="/ups-heru-logo.jpg" alt="Upsheru Logo" className="h-12 md:h-16 w-auto" />`);
  
  fs.writeFileSync(fullPath, content, 'utf8');
}

replaceInFile('src/app/page.tsx');
console.log('Replaced logo in navbar with image.');
