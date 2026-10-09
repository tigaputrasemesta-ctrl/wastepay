const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

code = code.replace(
  'let isStopAngkut = false;',
  'let isStopAngkut = warnaInfo.isStopAngkut;'
);

code = code.replace(
  'if (!isLunas && t.status !== \\\'libur\\\' && hariTelat >= 7) {\n                isStopAngkut = true;\n              }',
  ''
);

fs.writeFileSync('src/components/MapView.tsx', code);
