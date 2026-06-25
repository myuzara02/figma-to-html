import { describe, it, expect } from "vitest";
import { parseDesignContext } from "../../src/dc/parse-dc";

// Real get_design_context output for node 4388:3414 (one stat column).
const DC = `const imgVector6 = "https://www.figma.com/api/mcp/asset/fdc19b8b";

export default function Frame39674() {
  return (
    <div className="content-stretch flex flex-col gap-[80px] items-center justify-center relative size-full" data-node-id="4388:3414">
      <div className="h-0 relative shrink-0 w-full" data-node-id="4388:3415">
        <div className="absolute inset-[-0.5px_0]">
          <img alt="" className="block max-w-none size-full" src={imgVector6} />
        </div>
      </div>
      <div className="content-stretch flex flex-col gap-[20px] items-center justify-center text-center" data-node-id="4388:3416">
        <p className="font-['Aeonik:Regular'] leading-[1.1] text-[100px] text-white tracking-[-1px] w-[330px]" data-node-id="4388:3417">
          60+
        </p>
        <p className="font-['Aeonik:Medium'] text-[16px] text-[rgba(255,255,255,0.3)] tracking-[0.32px]" data-node-id="4388:3418">
          Projekte, die in skalierbare Inhaltssysteme verwandelt wurden
        </p>
      </div>
    </div>
  );
}`;

describe("parseDesignContext — className map", () => {
  it("captures the asset map", () => {
    const { assets } = parseDesignContext(DC);
    expect(assets.imgVector6).toBe("https://www.figma.com/api/mcp/asset/fdc19b8b");
  });

  it("indexes every data-node-id element by its className", () => {
    const { nodes } = parseDesignContext(DC);
    expect(Object.keys(nodes).sort()).toEqual([
      "4388:3414", "4388:3415", "4388:3416", "4388:3417", "4388:3418",
    ]);
    expect(nodes["4388:3414"].className).toContain("flex flex-col gap-[80px]");
    expect(nodes["4388:3417"].className).toContain("text-[100px]");
    expect(nodes["4388:3417"].className).toContain("font-['Aeonik:Regular']");
  });

  it("does not index wrapper elements without a data-node-id", () => {
    const { nodes } = parseDesignContext(DC);
    // the inner absolute wrapper and the <img> have no data-node-id
    expect(Object.keys(nodes)).not.toContain("");
    expect(Object.keys(nodes)).toHaveLength(5);
  });
});
