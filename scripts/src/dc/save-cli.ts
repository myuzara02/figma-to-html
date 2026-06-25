import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Save a converted Lumos section to the repo's git-ignored cache/ folder as a SINGLE file
 * `cache/<name>.html`, restructured so the markup and the CSS are clearly separated:
 *
 *   <!-- Lumos section "<name>" (Figma → Lumos) -->
 *   <!-- HTML -->
 *   <section ...> ...markup (no inline <style>)... </section>
 *
 *   <!-- STYLE -->
 *   <style> ...all the CSS... </style>
 *
 * Input is the combined section (markup with the <style> block inside, as produced by the translator).
 * Usage: tsx src/dc/save-cli.ts <combined.html> <name>
 */
const [, , combinedPath, name] = process.argv;
if (!combinedPath || !name) {
  console.error("usage: save-cli <combined.html> <name>");
  process.exit(1);
}

const combined = readFileSync(combinedPath, "utf8").trim();

// Pull the <style> block out of the markup (it lives inside the section by default).
const styleBlock = combined.match(/<style>[\s\S]*?<\/style>/)?.[0] ?? "";
const markup = (styleBlock ? combined.replace(/[ \t]*<style>[\s\S]*?<\/style>[ \t]*\n?/, "") : combined)
  .replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n")
  .trim();

const parts = [`<!-- Lumos section "${name}" (Figma → Lumos) -->`, "<!-- HTML -->", markup];
if (styleBlock) parts.push("", "<!-- STYLE -->", styleBlock);

// save-cli.ts is at scripts/src/dc/ → three levels up is the repo root.
const cacheDir = fileURLToPath(new URL("../../../cache/", import.meta.url));
mkdirSync(cacheDir, { recursive: true });
writeFileSync(`${cacheDir}${name}.html`, `${parts.join("\n")}\n`);

console.log(`saved cache/${name}.html`);
