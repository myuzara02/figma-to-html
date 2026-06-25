import type { MetaNode } from "./parse-meta";
import type { ParsedDC } from "./parse-dc";
import { parseTailwind } from "./tailwind";
import { detectRole } from "./role";
import { resolveStyle, type StyleScales } from "./resolve-style";
import { resolveLayout } from "./resolve-layout";
import type { SpacingScale } from "./spacing";
import type { EnrichedNode } from "./enriched";

export interface MergeScales {
  style: StyleScales;
  spacing: SpacingScale;
}

/** Walk the metadata tree, join design-context facts by node id, and assemble the enriched IR tree. */
export function mergeDesign(meta: MetaNode, dc: ParsedDC, scales: MergeScales): EnrichedNode {
  const facts = dc.nodes[meta.id];
  const styleFacts = facts ? parseTailwind(facts.className) : {};

  const role = detectRole({
    type: meta.type,
    rect: meta.rect,
    hasChildren: meta.children.length > 0,
    assetVar: facts?.assetVar,
  });
  const style = resolveStyle(styleFacts, scales.style);
  const layout = resolveLayout(meta.rect, styleFacts, meta.children, scales.spacing);
  const children = meta.children.map((child) => mergeDesign(child, dc, scales));

  const node: EnrichedNode = {
    id: meta.id,
    name: meta.name,
    role,
    rect: meta.rect,
    layout,
    children,
  };

  if (facts?.text !== undefined) node.text = facts.text;
  if (Object.keys(style).length > 0) node.style = style;
  if (facts?.assetVar) node.asset = { var: facts.assetVar, url: dc.assets[facts.assetVar] };

  return node;
}
