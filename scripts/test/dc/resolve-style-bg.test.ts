import { describe, it, expect } from "vitest";
import { resolveStyle, type StyleScales } from "../../src/dc/resolve-style";
import type { StyleFacts } from "../../src/dc/tailwind";

const scales: StyleScales = {
  typeScale: [{ util: "u-text-style-main", px: 16 }],
  palette: [
    { var: "--_theme---background", rgba: { r: 0, g: 0, b: 0, a: 1 } },
    { var: "--_theme---text", rgba: { r: 255, g: 255, b: 255, a: 1 } },
  ],
};

describe("resolveStyle — background color", () => {
  it("maps a faded dark background to the nearest theme var with preserved alpha", () => {
    const facts: StyleFacts = { bgColor: "rgba(0,0,0,0.8)" };
    const s = resolveStyle(facts, scales);
    expect(s.bgColorVar).toBe("--_theme---background");
    expect(s.bgColorAlpha).toBe(0.8);
  });
  it("leaves bg fields undefined when there is no bgColor", () => {
    const s = resolveStyle({ color: "white" }, scales);
    expect(s.bgColorVar).toBeUndefined();
    expect(s.bgColorAlpha).toBeUndefined();
  });
});
