import { describe, it, expect } from "vitest";
import { DEFAULT_SCALES, DEFAULT_SPACING_SCALE, DEFAULT_TYPE_SCALE } from "../../src/dc/default-scales";
import { snapSpacing } from "../../src/dc/spacing";
import { mapTypeStyle } from "../../src/dc/type-style";

describe("default scales", () => {
  it("spacing scale covers space--1..8 and snaps sensibly", () => {
    expect(DEFAULT_SPACING_SCALE).toHaveLength(8);
    expect(snapSpacing(80, DEFAULT_SPACING_SCALE).token).toBe("space--8");
    expect(snapSpacing(16, DEFAULT_SPACING_SCALE).token).toBe("space--3");
  });
  it("type scale maps common sizes to the right tier", () => {
    expect(mapTypeStyle(64, DEFAULT_TYPE_SCALE).util).toBe("u-text-style-h1");
    expect(mapTypeStyle(16, DEFAULT_TYPE_SCALE).util).toBe("u-text-style-main");
    expect(mapTypeStyle(100, DEFAULT_TYPE_SCALE).util).toBe("u-text-style-display");
  });
  it("DEFAULT_SCALES bundles style + spacing", () => {
    expect(DEFAULT_SCALES.spacing).toBe(DEFAULT_SPACING_SCALE);
    expect(DEFAULT_SCALES.style.typeScale).toBe(DEFAULT_TYPE_SCALE);
    expect(DEFAULT_SCALES.style.palette.length).toBeGreaterThan(0);
  });
});
