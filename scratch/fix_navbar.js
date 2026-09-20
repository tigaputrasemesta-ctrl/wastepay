const fs = require('fs');
let content = fs.readFileSync('src/components/PublicNavbar.tsx', 'utf8');

content = content.replace(
  /<p className="text-\[10px\] text-slate-500 font-medium truncate leading-normal mt-0\.5">\s*Sistem Retribusi Bersih\s*<\/p>/g,
  '<p className="text-[10px] text-slate-500 font-medium truncate leading-normal mt-0.5">Pengelolaan Sampah Terpadu Kota Depok</p>'
);

fs.writeFileSync('src/components/PublicNavbar.tsx', content);
console.log('Fixed PublicNavbar.tsx text');
