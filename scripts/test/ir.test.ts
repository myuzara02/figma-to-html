import { describe, it, expect } from "vitest";
import { leafBox, type InputNode } from "../src/ir";

describe("leafBox", () => {
  it("builds a childless box with neutral defaults", () => {
    const node: InputNode = { id: "n1", name: "Text", rect: { x: 0, y: 0, w: 100, h: 20 } };
    const box = leafBox(node);
    expect(box.id).toBe("n1");
    expect(box.name).toBe("Text");
    expect(box.layout).toBe("stack");
    expect(box.children).toEqual([]);
    expect(box.confidence).toBe(1);
    expect(box.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(box.sizing).toEqual({ width: "fixed", height: "fixed" });
  });
});
