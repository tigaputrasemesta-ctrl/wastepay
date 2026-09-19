const fs = require("fs");
const path = require("path");

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walkSync(p, callback);
    } else {
      if (p.endsWith(".ts") || p.endsWith(".tsx")) {
        callback(p);
      }
    }
  }
}

walkSync(path.join(__dirname, "src"), (p) => {
  let content = fs.readFileSync(p, "utf-8");
  
  // Specific replacements first
  content = content.replace(/UPS HERU WastePay/gi, "UPS HERU");
  content = content.replace(/WastePay UPS HERU/gi, "UPS HERU");
  content = content.replace(/WastePay Driver/gi, "UPS HERU Driver");
  content = content.replace(/WastePay Portal/gi, "UPS HERU Portal");
  content = content.replace(/WastePay •/gi, "UPS HERU •");
  
  // General replacement for visible texts (avoid URLs and code terms if possible)
  // Let's just do a blanket replace for "WastePay" but ignoring case, EXCEPT for URLs like wastepay.vercel.app
  // and preserving case if possible, but actually just replace "WastePay" with "UPS HERU"
  content = content.replace(/(?<!\.)WastePay(?!.vercel.app|.id)/g, "UPS HERU");
  
  // Clean up double UPS HERU just in case
  content = content.replace(/UPS HERU UPS HERU/g, "UPS HERU");

  fs.writeFileSync(p, content, "utf-8");
});

console.log("Done");
