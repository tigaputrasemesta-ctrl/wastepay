const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

code = code.replace(
  'function popupHtml(p: PelangganPeta): string {',
  'const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];\n\nfunction popupHtml(p: PelangganPeta): string {'
);

fs.writeFileSync('src/components/MapView.tsx', code);
