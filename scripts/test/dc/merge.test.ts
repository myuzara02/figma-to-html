import { describe, it, expect } from "vitest";
import { mergeDesign, type MergeScales } from "../../src/dc/merge";
import { parseMetadata } from "../../src/dc/parse-meta";
import { parseDesignContext } from "../../src/dc/parse-dc";

const XML = `
<frame id="4388:3414" name="Frame 39674" x="40" y="691" width="440" height="222">
  <vector id="4388:3415" name="Vector 6" x="0" y="0" width="440" height="0" />
  <frame id="4388:3416" name="Frame 39646" x="55" y="80" width="330" height="142">
    <text id="4388:3417" name="60+" x="0" y="0" width="330" height="70" />
    <text id="4388:3418" name="Label" x="0" y="90" width="330" height="52" />
  </frame>
</frame>`;

const DC = `const imgVector6 = "https://www.figma.com/api/mcp/asset/fdc19b8b";
export default function Frame39674() {
  return (
    <div className="flex flex-col gap-[80px] items-center justify-center" data-node-id="4388:3414">
      <div className="h-0 w-full" data-node-id="4388:3415">
        <div className="absolute"><img alt="" className="size-full" src={imgVector6} /></div>
      </div>
      <div className="flex flex-col gap-[20px] items-center justify-center" data-node-id="4388:3416">
        <p className="text-[100px] text-white" data-node-id="4388:3417">60+</p>
        <p className="text-[16px] text-[rgba(255,255,255,0.3)]" data-node-id="4388:3418">Projekte</p>
      </div>
    </div>
  );
}`;

const scales: MergeScales = {
  style: {
    typeScale: [{ util: "u-text-style-h1", px: 64 }, { util: "u-text-style-main", px: 16 }],
    palette: [
      { var: "--_theme---background", rgba: { r: 0, g: 0, b: 0, a: 1 } },
      { var: "--_theme---text", rgba: { r: 255, g: 255, b: 255, a: 1 } },
    ],
  },
  spacing: [{ token: "space--3", px: 16 }, { token: "space--5", px: 24 }, { token: "space--8", px: 80 }],
};

describe("mergeDesign", () => {
  const root = mergeDesign(parseMetadata(XML), parseDesignContext(DC), scales);

  it("builds the root container with autolayout column from the design context", () => {
    expect(root.id).toBe("4388:3414");
    expect(root.role).toBe("container");
    expect(root.layout.source).toBe("autolayout");
    expect(root.layout.layout).toBe("column");
    expect(root.layout.gap).toEqual({ token: "space--8", residualPx: 0 });
    expect(root.children).toHaveLength(2);
  });

  it("classifies the zero-height vector as a divider and resolves its asset URL", () => {
    const divider = root.children[0];
    expect(divider.id).toBe("4388:3415");
    expect(divider.role).toBe("divider");
    expect(divider.asset).toEqual({ var: "imgVector6", url: "https://www.figma.com/api/mcp/asset/fdc19b8b" });
    expect(divider.layout.layout).toBe("stack");
  });

  it("enriches the text nodes with verbatim text and resolved style (alpha preserved)", () => {
    const inner = root.children[1];
    expect(inner.role).toBe("container");
    const [h, label] = inner.children;
    expect(h.role).toBe("text");
    expect(h.text).toBe("60+");
    expect(h.style?.textStyle).toBe("u-text-style-h1"); // 100 → nearest 64
    expect(h.style?.colorVar).toBe("--_theme---text");
    expect(h.style?.colorAlpha).toBe(1);
    expect(label.text).toBe("Projekte");
    expect(label.style?.textStyle).toBe("u-text-style-main"); // 16 exact
    expect(label.style?.colorAlpha).toBe(0.3); // faded — preserved
  });
});
