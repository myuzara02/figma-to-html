import { parseMetadata } from "./parse-meta";
import { parseDesignContext } from "./parse-dc";
import { mergeDesign, type MergeScales } from "./merge";
import { DEFAULT_SCALES } from "./default-scales";
import type { EnrichedNode } from "./enriched";

/** End-to-end: Figma metadata XML + design-context JSX → enriched IR tree. */
export function runMerge(
  metadataXml: string,
  designContextJsx: string,
  scales: MergeScales = DEFAULT_SCALES,
): EnrichedNode {
  return mergeDesign(parseMetadata(metadataXml), parseDesignContext(designContextJsx), scales);
}
