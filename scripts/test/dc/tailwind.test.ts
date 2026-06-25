import { describe, it, expect } from "vitest";
import { parseTailwind } from "../../src/dc/tailwind";

describe("parseTailwind — layout", () => {
  it("reads a flex column with gap, alignment, and justify", () => {
    const f = parseTailwind("content-stretch flex flex-col gap-[80px] items-center justify-center relative size-full");
    expect(f.display).toBe("flex");
    expect(f.flexDirection).toBe("column");
    expect(f.gapPx).toBe(80);
    expect(f.align).toBe("center");
    expect(f.justify).toBe("center");
    expect(f.position).toBe("relative");
    expect(f.widthKeyword).toBe("full");
  });

  it("reads flex-row and a fixed pixel width", () => {
    const f = parseTailwind("flex flex-row w-[330px]");
    expect(f.flexDirection).toBe("row");
    expect(f.widthPx).toBe(330);
  });

  it("reads absolute position and justify-between", () => {
    const f = parseTailwind("absolute justify-between");
    expect(f.position).toBe("absolute");
    expect(f.justify).toBe("between");
  });

  it("ignores unknown tokens without throwing", () => {
    expect(parseTailwind("shrink-0 not-italic [word-break:break-word]")).toEqual({});
  });

  it("returns an empty object for an empty string", () => {
    expect(parseTailwind("")).toEqual({});
  });
});
