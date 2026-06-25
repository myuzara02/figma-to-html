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

    // --- typography ---
    const font = tok.match(/^font-\['([^':\]]+):([^'\]]+)'\]$/);
    if (font) { facts.fontFamily = font[1]; facts.fontWeight = font[2]; continue; }

    const size = tok.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
    if (size) { facts.fontSizePx = Number(size[1]); continue; }

    const leading = tok.match(/^leading-\[(\d+(?:\.\d+)?)\]$/);
    if (leading) { facts.lineHeight = Number(leading[1]); continue; }

    const tracking = tok.match(/^tracking-\[(-?\d+(?:\.\d+)?)px\]$/);
    if (tracking) { facts.letterSpacingPx = Number(tracking[1]); continue; }

    const talign = tok.match(/^text-(left|center|right)$/);
    if (talign) { facts.textAlign = talign[1] as "left" | "center" | "right"; continue; }

    // --- color (after size/align so it does not swallow them) ---
    const colorBracket = tok.match(/^text-\[(.+)\]$/);
    if (colorBracket) { facts.color = colorBracket[1]; continue; }
    if (tok === "text-white") { facts.color = "white"; continue; }
    if (tok === "text-black") { facts.color = "black"; continue; }

    // unknown token → ignore
  }
  return facts;
}
