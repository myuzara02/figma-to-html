import { describe, it, expect } from "vitest";
import { parseTailwind } from "../../src/dc/tailwind";

describe("parseTailwind — background color", () => {
  it("reads a bracketed rgba background", () => {
    expect(parseTailwind("bg-[rgba(0,0,0,0.8)]").bgColor).toBe("rgba(0,0,0,0.8)");
  });
  it("reads a hex background", () => {
    expect(parseTailwind("bg-[#101010]").bgColor).toBe("#101010");
  });
  it("reads named black/white backgrounds", () => {
    expect(parseTailwind("bg-black").bgColor).toBe("black");
    expect(parseTailwind("bg-white").bgColor).toBe("white");
  });
  it("does not set bgColor when no bg token is present", () => {
    expect(parseTailwind("flex text-white").bgColor).toBeUndefined();
  });
});
