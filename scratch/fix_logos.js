const fs = require('fs');

let pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');

// Replace the corrupted emoji div with the logo image
pageContent = pageContent.replace(
  /<div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">[\s\S]*?<\/div>/g,
  '<img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform shrink-0" />'
);

// Replace the redundant "UPS HERU" pill with "Depok"
pageContent = pageContent.replace(
  /<span className="text-\[10px\] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">\s*UPS HERU\s*<\/span>/g,
  '<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Depok</span>'
);

// There's also a footer logo with corrupted emoji, let's replace it too!
// <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-base">...</div>
pageContent = pageContent.replace(
  /<div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-base">[\s\S]*?<\/div>/g,
  '<img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="w-8 h-8 rounded-xl object-contain bg-white shadow-sm" />'
);

// Also fix any corrupted chars in page.tsx
pageContent = pageContent.replace(/Ac 2026/g, '© 2026');
pageContent = pageContent.replace(/dY\?>,\?/g, '✅');
pageContent = pageContent.replace(/dY'/g, '💬');

fs.writeFileSync('src/app/page.tsx', pageContent);

let layoutContent = fs.readFileSync('src/app/(public)/layout.tsx', 'utf8');
// Fix layout.tsx corrupted text and redundant stuff
layoutContent = layoutContent.replace(/dY\?>,\?/g, '✅');
layoutContent = layoutContent.replace(/dY'/g, '💬');
layoutContent = layoutContent.replace(/Ac 2026/g, '© 2026');
fs.writeFileSync('src/app/(public)/layout.tsx', layoutContent);

console.log('Fixed page.tsx and layout.tsx');
