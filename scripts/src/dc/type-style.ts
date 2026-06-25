export interface TypeStop {
  util: string;
  px: number;
}
export type TypeScale = TypeStop[];

export interface TypeStyleResult {
  util: string;
  residualPx: number;
}

/** Map a font size to the nearest Lumos text-style tier. Ties resolve to the smaller px. Throws on empty scale. */
export function mapTypeStyle(px: number, scale: TypeScale): TypeStyleResult {
  if (scale.length === 0) throw new Error("mapTypeStyle requires a non-empty scale");
  const sorted = [...scale].sort((a, b) => a.px - b.px);
  let best = sorted[0];
  let bestDist = Math.abs(px - best.px);
  for (const stop of sorted.slice(1)) {
    const d = Math.abs(px - stop.px);
    if (d < bestDist) {
      best = stop;
      bestDist = d;
    }
  }
  return { util: best.util, residualPx: px - best.px };
}
