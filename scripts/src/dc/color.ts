export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, Rgba> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
};

/** Parse a color string (rgb/rgba, #rgb/#rrggbb/#rrggbbaa, named white/black). Returns null if unrecognized. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (s in NAMED) return { ...NAMED[s] };

  const rgba = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgba) {
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: rgba[4] !== undefined ? Number(rgba[4]) : 1 };
  }

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return null;
}

export interface ThemeColor {
  var: string;
  rgba: Rgba;
}
export type ThemePalette = ThemeColor[];

export interface ColorMatch {
  themeVar: string;
  distance: number;
}

function rgbDistance(a: Rgba, b: Rgba): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** Map a color to the nearest palette entry by RGB distance (alpha ignored). Null if unparseable or empty palette. */
export function mapColor(input: string, palette: ThemePalette): ColorMatch | null {
  const c = parseColor(input);
  if (!c || palette.length === 0) return null;
  let best = palette[0];
  let bestDist = rgbDistance(c, best.rgba);
  for (const entry of palette.slice(1)) {
    const d = rgbDistance(c, entry.rgba);
    if (d < bestDist) {
      best = entry;
      bestDist = d;
    }
  }
  return { themeVar: best.var, distance: bestDist };
}
