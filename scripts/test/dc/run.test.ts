import { describe, it, expect } from "vitest";
import { runMerge } from "../../src/dc/run";

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
    <div className="flex flex-col gap-[64px] items-center justify-center" data-node-id="4388:3414">
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

describe("runMerge (end-to-end with default scales)", () => {
  const root = runMerge(XML, DC);

  it("produces the enriched root with autolayout column and snapped gap", () => {
    expect(root.id).toBe("4388:3414");
    expect(root.role).toBe("container");
    expect(root.layout.layout).toBe("column");
    expect(root.layout.gap).toEqual({ token: "space--8", residualPx: 0 });
  });

  it("enriches the heading with a display tier and the faded label with preserved alpha", () => {
    const inner = root.children[1];
    const [h, label] = inner.children;
    expect(h.text).toBe("60+");
    expect(h.style?.textStyle).toBe("u-text-style-display"); // 100 nearest 120 in the full default scale
    expect(h.style?.colorAlpha).toBe(1);
    expect(label.text).toBe("Projekte");
    expect(label.style?.textStyle).toBe("u-text-style-main");
    expect(label.style?.colorAlpha).toBe(0.3);
  });

  it("resolves the divider asset URL", () => {
    expect(root.children[0].role).toBe("divider");
    expect(root.children[0].asset?.url).toBe("https://www.figma.com/api/mcp/asset/fdc19b8b");
  });
});
