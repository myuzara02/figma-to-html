import type { Rect } from "../geometry";

export interface MetaNode {
  id: string;
  name: string;
  type: string;
  rect: Rect; // absolute (parent offsets accumulated)
  children: MetaNode[];
}

/** Parse Figma `get_metadata` XML into a node tree with ABSOLUTE rects. Throws if no element is found. */
export function parseMetadata(xml: string): MetaNode {
  // Matches an opening, closing, or self-closing tag with double-quoted attributes only.
  const tagRe = /<(\/?)([A-Za-z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>/g;
  const attrRe = /([\w-]+)="([^"]*)"/g;

  const stack: MetaNode[] = [];
  let root: MetaNode | null = null;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(xml)) !== null) {
    const closing = m[1] === "/";
    const type = m[2];
    const attrStr = m[3];
    const selfClosing = m[4] === "/";

    if (closing) {
      stack.pop();
      continue;
    }

    const attrs: Record<string, string> = {};
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrStr)) !== null) attrs[a[1]] = a[2];

    const parent = stack[stack.length - 1];
    const baseX = parent ? parent.rect.x : 0;
    const baseY = parent ? parent.rect.y : 0;

    const node: MetaNode = {
      id: attrs.id ?? "",
      name: attrs.name ?? "",
      type,
      rect: {
        x: baseX + Number(attrs.x ?? 0),
        y: baseY + Number(attrs.y ?? 0),
        w: Number(attrs.width ?? 0),
        h: Number(attrs.height ?? 0),
      },
      children: [],
    };

    if (parent) parent.children.push(node);
    else if (!root) root = node;

    if (!selfClosing) stack.push(node);
  }

  if (!root) throw new Error("parseMetadata: no element found");
  return root;
}
