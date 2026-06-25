import { describe, it, expect } from "vitest";
import { verifyIR } from "../../src/dc/verify";
import type { EnrichedNode } from "../../src/dc/enriched";

// Build an EnrichedNode with sane defaults; override per test.
function node(partial: Partial<EnrichedNode>): EnrichedNode {
  return {
    id: "n",
    name: "Node",
    role: "container",
    rect: { x: 0, y: 0, w: 10, h: 10 },
    layout: { layout: "column", source: "autolayout", confidence: 1 },
    children: [],
    ...partial,
  };
}

describe("verifyIR", () => {
  it("returns no issues for a clean tree", () => {
    const tree = node({
      children: [
        node({ id: "a", role: "text", text: "Hello", layout: { layout: "stack", source: "autolayout", confidence: 1 } }),
      ],
    });
    expect(verifyIR(tree)).toEqual({ issues: [], counts: {} });
  });

  it("flags low-confidence inferred layout", () => {
    const tree = node({ id: "row", layout: { layout: "stack", source: "inferred", confidence: 0.4 } });
    const r = verifyIR(tree);
    expect(r.issues.map((i) => i.rule)).toContain("low-confidence-layout");
  });

  it("does NOT flag an inferred layout at confidence 0.9", () => {
    const tree = node({ layout: { layout: "row", source: "inferred", confidence: 0.9 } });
    expect(verifyIR(tree).issues).toEqual([]);
  });

  it("flags a large gap residual", () => {
    const tree = node({ layout: { layout: "column", source: "autolayout", confidence: 1, gap: { token: "space--8", residualPx: 220 } } });
    expect(verifyIR(tree).counts["high-gap-residual"]).toBe(1);
  });

  it("flags a large type-style residual", () => {
    const tree = node({ id: "h", role: "text", text: "60+", style: { textStyle: "u-text-style-display", textStyleResidualPx: -20 }, layout: { layout: "stack", source: "autolayout", confidence: 1 } });
    expect(verifyIR(tree).counts["high-type-residual"]).toBe(1);
  });

  it("flags a far color match", () => {
    const tree = node({ id: "t", role: "text", text: "x", style: { colorVar: "--_theme---text", colorDistance: 200 }, layout: { layout: "stack", source: "autolayout", confidence: 1 } });
    expect(verifyIR(tree).counts["far-color"]).toBe(1);
  });

  it("flags empty text and missing asset", () => {
    const tree = node({
      children: [
        node({ id: "t", role: "text", text: "   ", layout: { layout: "stack", source: "autolayout", confidence: 1 } }),
        node({ id: "img", role: "image", layout: { layout: "stack", source: "autolayout", confidence: 1 } }),
      ],
    });
    const rules = verifyIR(tree).issues.map((i) => i.rule);
    expect(rules).toContain("empty-text");
    expect(rules).toContain("missing-asset");
  });

  it("flags an ambiguous stack container with multiple children", () => {
    const tree = node({
      id: "c",
      role: "container",
      layout: { layout: "stack", source: "inferred", confidence: 1 },
      children: [node({ id: "a" }), node({ id: "b" })],
    });
    expect(verifyIR(tree).counts["ambiguous-stack"]).toBe(1);
  });

  it("aggregates counts and visits the whole tree", () => {
    const tree = node({
      layout: { layout: "column", source: "autolayout", confidence: 1, gap: { token: "space--8", residualPx: 220 } },
      children: [
        node({ id: "h1", role: "text", text: "60+", style: { textStyleResidualPx: -20 }, layout: { layout: "stack", source: "autolayout", confidence: 1 } }),
        node({ id: "h2", role: "text", text: "12", style: { textStyleResidualPx: -20 }, layout: { layout: "stack", source: "autolayout", confidence: 1 } }),
      ],
    });
    const r = verifyIR(tree);
    expect(r.counts["high-gap-residual"]).toBe(1);
    expect(r.counts["high-type-residual"]).toBe(2);
  });
});
