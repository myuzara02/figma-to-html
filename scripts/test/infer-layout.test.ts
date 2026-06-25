import { describe, it, expect } from "vitest";
import { inferLayout } from "../src/infer-layout";
import type { InputNode } from "../src/ir";

describe("inferLayout", () => {
  it("annotates a section containing a row of three cards", () => {
    const tree: InputNode = {
      id: "section",
      name: "Section",
      rect: { x: 0, y: 0, w: 360, h: 140 },
      children: [
        { id: "c1", rect: { x: 20, y: 20, w: 100, h: 100 } },
        { id: "c2", rect: { x: 130, y: 20, w: 100, h: 100 } },
        { id: "c3", rect: { x: 240, y: 20, w: 100, h: 100 } },
      ],
    };

    const box = inferLayout(tree);
    expect(box.layout).toBe("row");
    expect(box.gap).toBe(10); // 130-(20+100)=10
    expect(box.padding).toEqual({ top: 20, right: 20, bottom: 20, left: 20 });
    expect(box.children).toHaveLength(3);
    expect(box.children[0].layout).toBe("stack"); // leaves have no children
    expect(box.children[0].id).toBe("c1");
  });

  it("returns a leaf box for a childless node", () => {
    const box = inferLayout({ id: "t", rect: { x: 0, y: 0, w: 10, h: 10 } });
    expect(box.children).toEqual([]);
    expect(box.confidence).toBe(1);
  });
});
