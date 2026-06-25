import { describe, it, expect } from "vitest";
import { extractAssets } from "../../src/dc/parse-dc";

describe("extractAssets", () => {
  it("maps const asset declarations to their URLs", () => {
    const jsx = `const imgVector6 = "https://www.figma.com/api/mcp/asset/abc-123";
const imgPhoto = "https://www.figma.com/api/mcp/asset/def-456";
export default function X() { return null; }`;
    expect(extractAssets(jsx)).toEqual({
      imgVector6: "https://www.figma.com/api/mcp/asset/abc-123",
      imgPhoto: "https://www.figma.com/api/mcp/asset/def-456",
    });
  });

  it("returns an empty object when there are no asset consts", () => {
    expect(extractAssets("export default function X() { return null; }")).toEqual({});
  });
});
