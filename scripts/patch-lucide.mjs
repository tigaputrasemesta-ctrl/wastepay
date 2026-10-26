import fs from "fs";
import path from "path";

const filesToPatch = [
  path.join(process.cwd(), "node_modules", "lucide-react", "dist", "cjs", "lucide-react.js"),
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;
    if (content.includes("const LucideContext = react.createContext({});")) {
      content = content.replace(
        "const LucideContext = react.createContext({});",
        "const LucideContext = react.createContext ? react.createContext({}) : null;"
      );
      changed = true;
    }
    if (content.includes("const useLucideContext = () => react.useContext(LucideContext);")) {
      content = content.replace(
        "const useLucideContext = () => react.useContext(LucideContext);",
        "const useLucideContext = () => (react.useContext && LucideContext ? react.useContext(LucideContext) : {});"
      );
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`[patch-lucide] Successfully patched ${file}`);
    }
  }
}
