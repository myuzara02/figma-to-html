export type Align = "start" | "center" | "end" | "stretch";
export type Justify = "start" | "center" | "end" | "between";

export interface StyleFacts {
  display?: "flex";
  flexDirection?: "row" | "column";
  align?: Align;
  justify?: Justify;
  gapPx?: number;
  position?: "absolute" | "relative";
  widthPx?: number;
  widthKeyword?: "full" | "min-content" | "max-content";
  fontFamily?: string;
  fontWeight?: string;
  fontSizePx?: number;
  lineHeight?: number;
  letterSpacingPx?: number;
  textAlign?: "left" | "center" | "right";
  color?: string;
}

/** Parse a Figma `get_design_context` className into raw style facts. Tolerant: unknown tokens are ignored. */
export function parseTailwind(className: string): StyleFacts {
  const facts: StyleFacts = {};
  for (const tok of className.split(/\s+/).filter(Boolean)) {
    if (tok === "flex") { facts.display = "flex"; continue; }
    if (tok === "flex-col") { facts.flexDirection = "column"; continue; }
    if (tok === "flex-row") { facts.flexDirection = "row"; continue; }

    const items = tok.match(/^items-(start|center|end|stretch)$/);
    if (items) { facts.align = items[1] as Align; continue; }

    const justify = tok.match(/^justify-(start|center|end|between)$/);
    if (justify) { facts.justify = justify[1] as Justify; continue; }

    const gap = tok.match(/^gap-\[(-?\d+(?:\.\d+)?)px\]$/);
    if (gap) { facts.gapPx = Number(gap[1]); continue; }

    if (tok === "absolute" || tok === "relative") { facts.position = tok; continue; }

    if (tok === "w-full" || tok === "size-full") { facts.widthKeyword = "full"; continue; }

    const wpx = tok.match(/^w-\[(\d+(?:\.\d+)?)px\]$/);
    if (wpx) { facts.widthPx = Number(wpx[1]); continue; }

    const wkw = tok.match(/^w-\[(min-content|max-content)\]$/);
    if (wkw) { facts.widthKeyword = wkw[1] as "min-content" | "max-content"; continue; }

    // unknown token → ignore
  }
  return facts;
}
