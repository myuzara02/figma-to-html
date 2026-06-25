import { describe, it, expect } from "vitest";
import { overlap1D, rectsOverlap, median, boundingBox } from "../src/geometry";

describe("overlap1D", () => {
  it("returns overlap length when segments overlap", () => {
    expect(overlap1D(0, 10, 5, 10)).toBe(5);
  });
  it("returns 0 when disjoint", () => {
    expect(overlap1D(0, 10, 20, 5)).toBe(0);
  });
});

describe("rectsOverlap", () => {
  it("true when rects overlap in both axes", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it("false when only touching (within tol)", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe("median", () => {
  it("odd length", () => { expect(median([3, 1, 2])).toBe(2); });
  it("even length", () => { expect(median([1, 2, 3, 4])).toBe(2.5); });
  it("empty is 0", () => { expect(median([])).toBe(0); });
});

describe("boundingBox", () => {
  it("wraps all rects", () => {
    expect(boundingBox([
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 50, y: 5, w: 10, h: 40 },
    ])).toEqual({ x: 10, y: 5, w: 50, h: 40 });
  });
  it("throws on empty input", () => {
    expect(() => boundingBox([])).toThrow();
  });
});
