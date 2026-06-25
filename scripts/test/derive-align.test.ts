import { describe, it, expect } from "vitest";
import { deriveAlign, deriveJustify, deriveSizing } from "../src/derive";

const box = (x: number, y: number, w = 10, h = 10) => ({ rect: { x, y, w, h } });

describe("deriveAlign (cross-axis)", () => {
  it("row with equal tops → start", () => {
    expect(deriveAlign([box(0, 0, 10, 10), box(20, 0, 10, 30)], "row")).toBe("start");
  });
  it("row with shared vertical centers → center", () => {
    // centers at y=15 for both: a is y0..30, b is y10..20
    expect(deriveAlign([box(0, 0, 10, 30), box(20, 10, 10, 10)], "row")).toBe("center");
  });
});

describe("deriveAlign (cross-axis)", () => {
  it("column with shared right edges → end", () => {
    // column layout → cross axis is X; ends all = 30
    expect(deriveAlign([box(20, 0, 10, 10), box(0, 20, 30, 10)], "column")).toBe("end");
  });
  it("column with no shared edge/center → stretch", () => {
    expect(deriveAlign([box(0, 0, 10, 10), box(0, 20, 40, 10), box(5, 40, 20, 10)], "column")).toBe("stretch");
  });
});

describe("deriveJustify (main-axis)", () => {
  it("equal leading and trailing space → center", () => {
    const container = { x: 0, y: 0, w: 100, h: 20 };
    expect(deriveJustify(container, [box(40, 0, 20, 10)], "row")).toBe("center");
  });
  it("small leading space → start", () => {
    const container = { x: 0, y: 0, w: 100, h: 20 };
    expect(deriveJustify(container, [box(0, 0, 20, 10)], "row")).toBe("start");
  });
});

describe("deriveSizing", () => {
  it("fills width when spanning the parent content box", () => {
    const parent = { x: 0, y: 0, w: 100, h: 100 };
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const child = { x: 10, y: 10, w: 80, h: 20 }; // 80 == 100-10-10
    expect(deriveSizing(child, parent, padding)).toEqual({ width: "fill", height: "fixed" });
  });
});
