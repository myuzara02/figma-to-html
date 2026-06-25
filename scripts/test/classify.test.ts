import { describe, it, expect } from "vitest";
import { classifyArrangement, anyOverlap } from "../src/classify";

const box = (x: number, y: number, w = 10, h = 10) => ({ rect: { x, y, w, h } });

describe("anyOverlap", () => {
  it("detects overlapping rects", () => {
    expect(anyOverlap([box(0, 0), box(5, 5)])).toBe(true);
  });
  it("false for disjoint rects", () => {
    expect(anyOverlap([box(0, 0), box(20, 0)])).toBe(false);
  });
});

describe("classifyArrangement", () => {
  it("single child → column, full confidence", () => {
    expect(classifyArrangement([box(0, 0)])).toEqual({ layout: "column", confidence: 1 });
  });
  it("side-by-side → row", () => {
    expect(classifyArrangement([box(0, 0), box(20, 0), box(40, 0)]).layout).toBe("row");
  });
  it("stacked → column", () => {
    expect(classifyArrangement([box(0, 0), box(0, 20), box(0, 40)]).layout).toBe("column");
  });
  it("2x3 matrix → grid", () => {
    const items = [
      box(0, 0), box(20, 0), box(40, 0),
      box(0, 20), box(20, 20), box(40, 20),
    ];
    expect(classifyArrangement(items).layout).toBe("grid");
  });
  it("overlapping → stack with low confidence", () => {
    const result = classifyArrangement([box(0, 0, 30, 30), box(5, 5, 30, 30)]);
    expect(result.layout).toBe("stack");
    expect(result.confidence).toBeLessThan(0.5);
  });
});
