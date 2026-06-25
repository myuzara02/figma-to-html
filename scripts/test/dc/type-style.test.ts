import { describe, it, expect } from "vitest";
import { mapTypeStyle, type TypeScale } from "../../src/dc/type-style";

const scale: TypeScale = [
  { util: "u-text-style-h1", px: 64 },
  { util: "u-text-style-h2", px: 48 },
  { util: "u-text-style-main", px: 16 },
  { util: "u-text-style-small", px: 14 },
];

describe("mapTypeStyle", () => {
  it("maps an exact size with zero residual", () => {
    expect(mapTypeStyle(16, scale)).toEqual({ util: "u-text-style-main", residualPx: 0 });
  });
  it("maps a large display size to the nearest tier", () => {
    // 100 nearest 64 (h1); residual 100-64 = 36
    expect(mapTypeStyle(100, scale)).toEqual({ util: "u-text-style-h1", residualPx: 36 });
  });
  it("maps with a small negative residual", () => {
    // 50 nearest 48 (h2); residual 50-48 = 2
    expect(mapTypeStyle(50, scale)).toEqual({ util: "u-text-style-h2", residualPx: 2 });
  });
  it("resolves a tie to the smaller px", () => {
    // 15 equidistant from 14 and 16 → choose 14 (small)
    expect(mapTypeStyle(15, scale)).toEqual({ util: "u-text-style-small", residualPx: 1 });
  });
  it("throws on an empty scale", () => {
    expect(() => mapTypeStyle(16, [])).toThrow();
  });
});
