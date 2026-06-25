export interface SpacingStop {
  token: string;
  px: number;
}
export type SpacingScale = SpacingStop[];

export interface SnapResult {
  token: string;
  residualPx: number;
}

/** Snap a pixel value to the nearest scale stop. Ties resolve to the smaller px. Throws on empty scale. */
export function snapSpacing(px: number, scale: SpacingScale): SnapResult {
  if (scale.length === 0) throw new Error("snapSpacing requires a non-empty scale");
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
  return { token: best.token, residualPx: px - best.px };
}
