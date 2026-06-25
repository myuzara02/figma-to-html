import { describe, it, expect } from "vitest";
import { DEFAULT_SCALES, DEFAULT_SPACING_SCALE, DEFAULT_TYPE_SCALE } from "../../src/dc/default-scales";
import { snapSpacing } from "../../src/dc/spacing";
import { mapTypeStyle } from "../../src/dc/type-style";

describe("default scales", () => {
  it("spacing scale matches the Lumos foundation (desktop px) and snaps sensibly", () => {
    expect(DEFAULT_SPACING_SCALE).toEqual([
      { token: "space--1", px: 8 },
      { token: "space--2", px: 12 },
      { token: "space--3", px: 16 },
      { token: "space--4", px: 24 },
      { token: "space--5", px: 32 },
      { token: "space--6", px: 40 },
      { token: "space--7", px: 48 },
      { token: "space--8", px: 64 },
    ]);
    expect(snapSpacing(40, DEFAULT_SPACING_SCALE).token).toBe("space--6");
    expect(snapSpacing(64, DEFAULT_SPACING_SCALE).token).toBe("space--8");
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
