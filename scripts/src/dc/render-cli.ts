import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToScreenshot } from "./render";

const [, , markupPath, outPath, widthArg] = process.argv;
if (!markupPath || !outPath) {
  console.error("usage: render-cli <markup.html> <out.png> [width]");
  process.exit(1);
}

// render-cli.ts is at scripts/src/dc/ → three levels up is the repo root.
const foundationUrl = new URL("../../../.claude/skills/lumos-skill/assets/lumos-foundation.css", import.meta.url);
const foundationCss = readFileSync(fileURLToPath(foundationUrl), "utf8");
const markupHtml = readFileSync(markupPath, "utf8");
const width = widthArg ? Number(widthArg) : undefined;

await renderToScreenshot(markupHtml, outPath, { foundationCss, width });
console.log("rendered", outPath);
