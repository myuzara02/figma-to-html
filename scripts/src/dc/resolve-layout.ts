import type { Rect } from "../geometry";
import type { StyleFacts } from "./tailwind";
import { snapSpacing, type SpacingScale } from "./spacing";
import { classifyArrangement } from "../classify";
import { deriveGap, deriveAlign, deriveJustify } from "../derive";
import type { LayoutInfo } from "./enriched";

/** Resolve a container's layout: from the design-context autolayout when present, else inferred from child geometry. */
export function resolveLayout(
  containerRect: Rect,
  facts: StyleFacts,
  children: { rect: Rect }[],
  spacingScale: SpacingScale,
): LayoutInfo {
  if (facts.display === "flex" && facts.flexDirection) {
    return {
      layout: facts.flexDirection,
      source: "autolayout",
      gap: facts.gapPx !== undefined ? snapSpacing(facts.gapPx, spacingScale) : undefined,
      align: facts.align,
      justify: facts.justify,
      confidence: 1,
    };
  }

  if (children.length === 0) {
    return { layout: "stack", source: "autolayout", confidence: 1 };
  }

  const cls = classifyArrangement(children);
  const { gap } = deriveGap(children, cls.layout);
  return {
    layout: cls.layout,
    source: "inferred",
    gap: snapSpacing(gap, spacingScale),
    align: deriveAlign(children, cls.layout),
    justify: deriveJustify(containerRect, children, cls.layout),
    confidence: cls.confidence,
  };
}
