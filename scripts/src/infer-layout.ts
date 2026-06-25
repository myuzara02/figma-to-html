import { leafBox, type InputNode, type LayoutBox } from "./ir";
import { classifyArrangement } from "./classify";
import { deriveAlign, deriveGap, deriveJustify, derivePadding, deriveSizing } from "./derive";

/** Recursively turn a Figma node tree into an annotated Layout Tree. */
export function inferLayout(node: InputNode): LayoutBox {
  const children = node.children ?? [];
  if (children.length === 0) return leafBox(node);

  const { layout, confidence } = classifyArrangement(children);
  const { gap, rowGap } = deriveGap(children, layout);
  const padding = derivePadding(node.rect, children);
  const align = deriveAlign(children, layout);
  const justify = deriveJustify(node.rect, children, layout);

  const childBoxes = children.map((child) => {
    const box = inferLayout(child);
    box.sizing = deriveSizing(child.rect, node.rect, padding);
    return box;
  });

  return {
    id: node.id,
    name: node.name,
    rect: node.rect,
    layout,
    gap,
    rowGap,
    padding,
    align,
    justify,
    sizing: { width: "fill", height: "hug" },
    confidence,
    children: childBoxes,
  };
}
