import { describe, it, expect } from "vitest";
import { parseTailwind } from "../../src/dc/tailwind";

describe("parseTailwind — typography & color", () => {
  it("reads font family/weight, size, leading, tracking, white color", () => {
    const f = parseTailwind("font-['Aeonik:Regular'] leading-[1.1] text-[100px] text-white tracking-[-1px] w-[330px]");
    expect(f.fontFamily).toBe("Aeonik");
    expect(f.fontWeight).toBe("Regular");
    expect(f.fontSizePx).toBe(100);
    expect(f.lineHeight).toBe(1.1);
    expect(f.letterSpacingPx).toBe(-1);
    expect(f.color).toBe("white");
    expect(f.widthPx).toBe(330);
  });

  it("reads an rgba color and positive tracking", () => {
    const f = parseTailwind("font-['Aeonik:Medium'] text-[16px] text-[rgba(255,255,255,0.3)] tracking-[0.32px]");
    expect(f.fontWeight).toBe("Medium");
    expect(f.fontSizePx).toBe(16);
    expect(f.color).toBe("rgba(255,255,255,0.3)");
    expect(f.letterSpacingPx).toBe(0.32);
  });

  it("reads text-center as text alignment, not color", () => {
    const f = parseTailwind("text-center text-black");
    expect(f.textAlign).toBe("center");
    expect(f.color).toBe("black");
  });
});
