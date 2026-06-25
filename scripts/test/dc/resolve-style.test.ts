import { describe, it, expect } from "vitest";
import { resolveStyle, type StyleScales } from "../../src/dc/resolve-style";
import type { StyleFacts } from "../../src/dc/tailwind";

const scales: StyleScales = {
  typeScale: [
    { util: "u-text-style-h1", px: 64 },
    { util: "u-text-style-main", px: 16 },
  ],
  palette: [
    { var: "--_theme---background", rgba: { r: 0, g: 0, b: 0, a: 1 } },
    { var: "--_theme---text", rgba: { r: 255, g: 255, b: 255, a: 1 } },
  ],
};

describe("resolveStyle", () => {
  it("resolves a large white heading (the 60+ case)", () => {
    const facts: StyleFacts = {
      fontFamily: "Aeonik", fontWeight: "Regular", fontSizePx: 100,
      lineHeight: 1.1, letterSpacingPx: -1, color: "white", widthPx: 330,
    };
    const s = resolveStyle(facts, scales);
    expect(s.textStyle).toBe("u-text-style-h1");
    expect(s.textStyleResidualPx).toBe(36);
    expect(s.fontWeight).toBe("Regular");
    expect(s.colorVar).toBe("--_theme---text");
    expect(s.colorAlpha).toBe(1);
    expect(s.lineHeight).toBe(1.1);
    expect(s.letterSpacingPx).toBe(-1);
  });

  it("preserves alpha for a faded label (rgba 0.3)", () => {
    const facts: StyleFacts = { fontWeight: "Medium", fontSizePx: 16, color: "rgba(255,255,255,0.3)" };
    const s = resolveStyle(facts, scales);
    expect(s.textStyle).toBe("u-text-style-main");
    expect(s.colorVar).toBe("--_theme---text");
    expect(s.colorAlpha).toBe(0.3);
  });

  it("returns an empty object when there are no style facts", () => {
    expect(resolveStyle({}, scales)).toEqual({});
  });
});
