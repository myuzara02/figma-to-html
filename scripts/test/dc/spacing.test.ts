import { describe, it, expect } from "vitest";
import { snapSpacing, type SpacingScale } from "../../src/dc/spacing";

const scale: SpacingScale = [
  { token: "space--1", px: 4 },
  { token: "space--3", px: 16 },
  { token: "space--5", px: 32 },
  { token: "space--8", px: 80 },
];

describe("snapSpacing", () => {
  it("snaps an exact value with zero residual", () => {
    expect(snapSpacing(80, scale)).toEqual({ token: "space--8", residualPx: 0 });
  });
  it("snaps to the nearest stop and reports signed residual", () => {
    // 20 is nearest 16 (space--3); residual 20-16 = 4
    expect(snapSpacing(20, scale)).toEqual({ token: "space--3", residualPx: 4 });
  });
  it("reports a negative residual when the value is below the nearest stop", () => {
    // 30 is nearest 32 (space--5); residual 30-32 = -2
    expect(snapSpacing(30, scale)).toEqual({ token: "space--5", residualPx: -2 });
  });
  it("resolves a tie to the smaller px stop", () => {
    // 24 is equidistant from 16 and 32 → choose 16 (space--3)
    expect(snapSpacing(24, scale)).toEqual({ token: "space--3", residualPx: 8 });
  });
  it("throws on an empty scale", () => {
    expect(() => snapSpacing(10, [])).toThrow();
  });
});
