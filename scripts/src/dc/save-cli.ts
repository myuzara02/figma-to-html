import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitStyle } from "./split-style";

/**
 * Split a combined Lumos section (markup + inline <style>) into two files in the repo's
 * git-ignored cache/ folder: <name>.html (markup) and <name>.css (component CSS).
 * Usage: tsx src/dc/save-cli.ts <combined.html> <name>
 */
const [, , combinedPath, name] = process.argv;
if (!combinedPath || !name) {
  console.error("usage: save-cli <combined.html> <name>");
  process.exit(1);
}

const combined = readFileSync(combinedPath, "utf8");
const { html, css } = splitStyle(combined);

// save-cli.ts is at scripts/src/dc/ → three levels up is the repo root.
const cacheDir = fileURLToPath(new URL("../../../cache/", import.meta.url));
mkdirSync(cacheDir, { recursive: true });

const htmlOut = `<!-- Lumos section "${name}" — companion CSS: ${name}.css -->\n${html.trim()}\n`;
writeFileSync(`${cacheDir}${name}.html`, htmlOut);
writeFileSync(`${cacheDir}${name}.css`, `${css}\n`);

console.log(`saved cache/${name}.html + cache/${name}.css`);
