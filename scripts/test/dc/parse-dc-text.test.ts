import { describe, it, expect } from "vitest";
import { parseDesignContext } from "../../src/dc/parse-dc";

const DC = `const imgVector6 = "https://www.figma.com/api/mcp/asset/fdc19b8b";

export default function Frame39674() {
  return (
    <div className="flex flex-col" data-node-id="4388:3414">
      <div className="h-0 w-full" data-node-id="4388:3415">
        <div className="absolute">
          <img alt="" className="size-full" src={imgVector6} />
        </div>
      </div>
      <div className="flex flex-col" data-node-id="4388:3416">
        <p className="text-[100px]" data-node-id="4388:3417">
          60+
        </p>
        <p className="text-[16px]" data-node-id="4388:3418">
          Projekte, die in skalierbare Inhaltssysteme verwandelt wurden
        </p>
      </div>
    </div>
  );
}`;

describe("parseDesignContext — text & asset", () => {
  it("captures the trimmed text content of leaf text nodes", () => {
    const { nodes } = parseDesignContext(DC);
    expect(nodes["4388:3417"].text).toBe("60+");
    expect(nodes["4388:3418"].text).toBe("Projekte, die in skalierbare Inhaltssysteme verwandelt wurden");
  });

  it("attributes an image src to its nearest data-node-id ancestor", () => {
    const { nodes } = parseDesignContext(DC);
    // the <img> sits inside an un-id'd wrapper inside 4388:3415
    expect(nodes["4388:3415"].assetVar).toBe("imgVector6");
  });

  it("leaves text undefined for container nodes with no direct text", () => {
    const { nodes } = parseDesignContext(DC);
    expect(nodes["4388:3416"].text).toBeUndefined();
  });
});
