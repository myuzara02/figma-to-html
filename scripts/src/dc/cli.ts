import { readFileSync } from "node:fs";
import { runMerge } from "./run";

/**
 * Thin CLI for the figma-to-lumos skill.
 * Usage: tsx scripts/src/dc/cli.ts <metadata.xml> <design-context.jsx>
 * Reads the two saved Figma MCP outputs and prints the enriched IR tree as JSON.
 */
const [, , metaPath, dcPath] = process.argv;
if (!metaPath || !dcPath) {
  console.error("usage: cli <metadata.xml> <design-context.jsx>");
  process.exit(1);
}

const xml = readFileSync(metaPath, "utf8");
const jsx = readFileSync(dcPath, "utf8");
console.log(JSON.stringify(runMerge(xml, jsx), null, 2));
