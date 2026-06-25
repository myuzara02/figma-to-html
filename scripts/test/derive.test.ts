import { describe, it, expect } from "vitest";
import { deriveGap, derivePadding } from "../src/derive";

const box = (x: number, y: number, w = 10, h = 10) => ({ rect: { x, y, w, h } });

describe("deriveGap", () => {
  it("row gap is the horizontal spacing between items", () => {
    // items at x=0,20,40 width 10 → gaps of 10
    expect(deriveGap([box(0, 0), box(20, 0), box(40, 0)], "row")).toEqual({ gap: 10 });
  });
  it("column gap is the vertical spacing between items", () => {
    expect(deriveGap([box(0, 0), box(0, 25), box(0, 50)], "column")).toEqual({ gap: 15 });
  });
  it("grid returns column gap and rowGap", () => {
    const items = [
      box(0, 0), box(20, 0),
      box(0, 30), box(20, 30),
    ];
    expect(deriveGap(items, "grid")).toEqual({ gap: 10, rowGap: 20 });
  });
});

describe("derivePadding", () => {
  it("is the inset from container edges to the children bounding box", () => {
    const container = { x: 0, y: 0, w: 100, h: 100 };
    const children = [box(10, 20, 30, 30), box(50, 20, 30, 30)];
    expect(derivePadding(container, children)).toEqual({ top: 20, right: 20, bottom: 50, left: 10 });
  });
});

describe("deriveGap edge cases", () => {
  it("empty children → gap 0", () => {
    expect(deriveGap([], "row")).toEqual({ gap: 0 });
  });
  it("single child → gap 0", () => {
    expect(deriveGap([box(0, 0)], "column")).toEqual({ gap: 0 });
  });
});

describe("derivePadding single child", () => {
  it("insets from container to the one child", () => {
    const container = { x: 0, y: 0, w: 100, h: 100 };
    expect(derivePadding(container, [box(10, 10, 30, 30)])).toEqual({ top: 10, right: 60, bottom: 60, left: 10 });
  });
});
