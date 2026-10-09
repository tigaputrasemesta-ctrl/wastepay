const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const oldIcon = `icon: buatIcon(getWarnaTagihan(p).warna, getWarnaTagihan(p).tunggakanCount >= 3),`;
const newIcon = `icon: buatIcon(getWarnaTagihan(p).warna, getWarnaTagihan(p).isStopAngkut),`;

code = code.replace(oldIcon, newIcon);
fs.writeFileSync('src/components/MapView.tsx', code);
