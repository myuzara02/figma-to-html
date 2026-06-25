import { describe, it, expect } from "vitest";
import { parseMetadata } from "../../src/dc/parse-meta";

// Real get_metadata output (stats subtree of node 4388:3408), trimmed to one stat column.
const XML = `
<frame id="4388:3413" name="Frame 39703" x="40" y="691" width="1360" height="222">
  <frame id="4388:3414" name="Frame 39674" x="0" y="0" width="440" height="222">
    <vector id="4388:3415" name="Vector 6" x="0" y="0" width="440" height="0" />
    <frame id="4388:3416" name="Frame 39646" x="55" y="80" width="330" height="142">
      <text id="4388:3417" name="60+" x="0" y="0" width="330" height="70" />
      <text id="4388:3418" name="Label" x="0" y="90" width="330" height="52" />
    </frame>
  </frame>
</frame>`;

describe("parseMetadata", () => {
  it("parses the root with its own coordinates as the origin", () => {
    const root = parseMetadata(XML);
    expect(root.id).toBe("4388:3413");
    expect(root.type).toBe("frame");
    expect(root.name).toBe("Frame 39703");
    expect(root.rect).toEqual({ x: 40, y: 691, w: 1360, h: 222 });
    expect(root.children).toHaveLength(1);
  });

  it("accumulates child offsets into absolute coordinates", () => {
    const root = parseMetadata(XML);
    const col = root.children[0]; // 4388:3414 at (0,0) rel → (40,691) abs
    expect(col.rect).toEqual({ x: 40, y: 691, w: 440, h: 222 });

    const [divider, inner] = col.children;
    expect(divider.id).toBe("4388:3415");
    expect(divider.type).toBe("vector");
    expect(divider.rect).toEqual({ x: 40, y: 691, w: 440, h: 0 });

    expect(inner.id).toBe("4388:3416"); // (55,80) rel to (40,691) → (95,771)
    expect(inner.rect).toEqual({ x: 95, y: 771, w: 330, h: 142 });
  });

  it("accumulates two levels deep for leaf text nodes", () => {
    const root = parseMetadata(XML);
    const inner = root.children[0].children[1]; // 4388:3416 at abs (95,771)
    const [t1, t2] = inner.children;
    expect(t1.id).toBe("4388:3417");
    expect(t1.type).toBe("text");
    expect(t1.rect).toEqual({ x: 95, y: 771, w: 330, h: 70 }); // (0,0) rel
    expect(t2.rect).toEqual({ x: 95, y: 861, w: 330, h: 52 }); // (0,90) rel → 771+90
  });

  it("throws when there is no element", () => {
    expect(() => parseMetadata("   ")).toThrow();
  });
});
