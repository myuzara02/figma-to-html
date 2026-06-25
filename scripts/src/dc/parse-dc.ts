/** Extract `const <var> = "<url>";` asset declarations from a get_design_context blob. */
export function extractAssets(jsx: string): Record<string, string> {
  const re = /const\s+(\w+)\s*=\s*"([^"]+)"\s*;/g;
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsx)) !== null) out[m[1]] = m[2];
  return out;
}

export interface DCFacts {
  className: string;
  text?: string;
  assetVar?: string;
}
export interface ParsedDC {
  assets: Record<string, string>;
  nodes: Record<string, DCFacts>;
}

/** Read a double-quoted attribute (e.g. className="...") out of a tag's attribute string. */
function getAttr(attrStr: string, name: string): string | undefined {
  const m = attrStr.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

/**
 * Parse a get_design_context blob into an asset map plus a flat per-data-node-id facts map.
 * Flat by design — structure comes from the metadata tree, not from this JSX.
 */
export function parseDesignContext(jsx: string): ParsedDC {
  const assets = extractAssets(jsx);
  const nodes: Record<string, DCFacts> = {};
  const tagRe = /<(\/?)([A-Za-z][\w]*)([^<>]*?)(\/?)>/g;

  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(jsx)) !== null) {
    const closing = m[1] === "/";
    if (closing) continue;
    const attrStr = m[3];
    const nodeId = getAttr(attrStr, "data-node-id");
    if (nodeId) {
      nodes[nodeId] = { className: getAttr(attrStr, "className") ?? "" };
    }
  }

  return { assets, nodes };
}
