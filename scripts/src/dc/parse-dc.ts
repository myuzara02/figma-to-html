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

/** Read an expression attribute (e.g. src={imgVar}) out of a tag's attribute string. */
function getExprAttr(attrStr: string, name: string): string | undefined {
  const m = attrStr.match(new RegExp(`(?:^|\\s)${name}=\\{(\\w+)\\}`));
  return m ? m[1] : undefined;
}

/**
 * Parse a get_design_context blob into an asset map plus a flat per-data-node-id facts map
 * (className, direct text content, and any contained image asset). Flat by design — structure
 * comes from the metadata tree, not from this JSX.
 */
export function parseDesignContext(jsx: string): ParsedDC {
  const assets = extractAssets(jsx);
  const nodes: Record<string, DCFacts> = {};
  const stack: Array<{ nodeId?: string }> = [];
  const tagRe = /<(\/?)([A-Za-z][\w]*)([^<>]*?)(\/?)>/g;

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(jsx)) !== null) {
    // Text between the previous tag and this one belongs to the nearest data-node-id ancestor.
    const between = jsx.slice(lastIndex, m.index).trim();
    if (between) {
      const ownerId = findOwner(stack);
      if (ownerId && nodes[ownerId]) {
        nodes[ownerId].text = nodes[ownerId].text ? `${nodes[ownerId].text} ${between}` : between;
      }
    }
    lastIndex = tagRe.lastIndex;

    const closing = m[1] === "/";
    const attrStr = m[3];
    const selfClosing = m[4] === "/";

    if (closing) {
      stack.pop();
      continue;
    }

    const nodeId = getAttr(attrStr, "data-node-id");
    if (nodeId) nodes[nodeId] = { className: getAttr(attrStr, "className") ?? "" };

    const assetVar = getExprAttr(attrStr, "src");
    if (assetVar) {
      const target = nodeId ?? findOwner(stack);
      if (target && nodes[target]) nodes[target].assetVar = assetVar;
    }

    if (!selfClosing) stack.push({ nodeId });
  }

  return { assets, nodes };
}

/** Nearest ancestor on the stack that carries a data-node-id. */
function findOwner(stack: Array<{ nodeId?: string }>): string | undefined {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].nodeId) return stack[i].nodeId;
  }
  return undefined;
}
