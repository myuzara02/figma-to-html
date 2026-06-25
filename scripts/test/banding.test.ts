import { describe, it, expect } from "vitest";
import { bandByAxis } from "../src/banding";

const box = (id: string, x: number, y: number, w = 10, h = 10) => ({ id, rect: { x, y, w, h } });
const ids = (bands: { id: string }[][]) => bands.map((b) => b.map((i) => i.id));

describe("bandByAxis", () => {
  it("one vertical band for a single horizontal row", () => {
    // three boxes side by side, same y → one row band
    const items = [box("a", 0, 0), box("b", 20, 0), box("c", 40, 0)];
    expect(ids(bandByAxis(items, "y"))).toEqual([["a", "b", "c"]]);
  });

  it("multiple vertical bands for a stacked column", () => {
    // three boxes stacked, increasing y → three row bands
    const items = [box("a", 0, 0), box("b", 0, 20), box("c", 0, 40)];
    expect(ids(bandByAxis(items, "y"))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("groups a 2x2 grid into two row bands", () => {
    const items = [box("a", 0, 0), box("b", 20, 0), box("c", 0, 20), box("d", 20, 20)];
    expect(ids(bandByAxis(items, "y"))).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("one column band for a single vertical stack on x-axis", () => {
    const items = [box("a", 0, 0), box("b", 0, 20), box("c", 0, 40)];
    expect(ids(bandByAxis(items, "x"))).toEqual([["a", "b", "c"]]);
  });
  it("multiple column bands for a horizontal row on x-axis", () => {
    const items = [box("a", 0, 0), box("b", 20, 0), box("c", 40, 0)];
    expect(ids(bandByAxis(items, "x"))).toEqual([["a"], ["b"], ["c"]]);
  });
});
