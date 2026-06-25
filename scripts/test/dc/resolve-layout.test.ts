import { describe, it, expect } from "vitest";
import { resolveLayout } from "../../src/dc/resolve-layout";
import type { SpacingScale } from "../../src/dc/spacing";
import type { StyleFacts } from "../../src/dc/tailwind";

const scale: SpacingScale = [
  { token: "space--3", px: 16 },
  { token: "space--8", px: 80 },
];
const box = (x: number, y: number, w = 100, h = 100) => ({ rect: { x, y, w, h } });
const container = { x: 0, y: 0, w: 360, h: 120 };

describe("resolveLayout", () => {
  it("uses the design-context autolayout when flex is present", () => {
    const facts: StyleFacts = { display: "flex", flexDirection: "column", gapPx: 80, align: "center", justify: "center" };
    const r = resolveLayout(container, facts, [box(0, 0), box(0, 90)], scale);
    expect(r.source).toBe("autolayout");
    expect(r.layout).toBe("column");
    expect(r.gap).toEqual({ token: "space--8", residualPx: 0 });
    expect(r.align).toBe("center");
    expect(r.justify).toBe("center");
    expect(r.confidence).toBe(1);
  });

  it("returns a stack leaf when there are no children and no flex", () => {
    const r = resolveLayout(container, {}, [], scale);
    expect(r.layout).toBe("stack");
    expect(r.source).toBe("autolayout");
  });

  it("infers a row from child geometry when the design context has no flex", () => {
    // three boxes side by side, 20px gaps → inferred row, gap snaps to space--3 (16)
    const r = resolveLayout(container, {}, [box(0, 0), box(120, 0), box(240, 0)], scale);
    expect(r.source).toBe("inferred");
    expect(r.layout).toBe("row");
    expect(r.gap).toEqual({ token: "space--3", residualPx: 4 }); // median gap 20 → nearest 16
    expect(r.confidence).toBeCloseTo(0.9);
  });
});
