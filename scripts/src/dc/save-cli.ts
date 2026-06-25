import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Save a converted Lumos section to the repo's git-ignored cache/ folder as a SINGLE file
 * `cache/<name>.html` — the CSS lives in the section's `<style>` block (kept clearly separate
 * from the markup, at the top), not in a separate file.
 * Usage: tsx src/dc/save-cli.ts <combined.html> <name>
 */
const [, , combinedPath, name] = process.argv;
if (!combinedPath || !name) {
  console.error("usage: save-cli <combined.html> <name>");
  process.exit(1);
}

const combined = readFileSync(combinedPath, "utf8").trim();

// save-cli.ts is at scripts/src/dc/ → three levels up is the repo root.
const cacheDir = fileURLToPath(new URL("../../../cache/", import.meta.url));
mkdirSync(cacheDir, { recursive: true });

writeFileSync(`${cacheDir}${name}.html`, `<!-- Lumos section "${name}" (Figma → Lumos) -->\n${combined}\n`);
console.log(`saved cache/${name}.html`);
