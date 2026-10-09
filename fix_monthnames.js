const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const arrDefinition = `const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];\n`;
code = code.replace(
  `function popupHtml(p: PelangganPeta): string {\n  try {`,
  `function popupHtml(p: PelangganPeta): string {\n  try {\n    ${arrDefinition}`
);

fs.writeFileSync('src/components/MapView.tsx', code);
