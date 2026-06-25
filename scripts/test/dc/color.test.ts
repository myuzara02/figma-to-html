import { describe, it, expect } from "vitest";
import { parseColor, mapColor, type ThemePalette } from "../../src/dc/color";

describe("parseColor", () => {
  it("parses rgba", () => {
    expect(parseColor("rgba(255,255,255,0.3)")).toEqual({ r: 255, g: 255, b: 255, a: 0.3 });
  });
  it("parses rgb with default alpha 1", () => {
    expect(parseColor("rgb(0, 128, 255)")).toEqual({ r: 0, g: 128, b: 255, a: 1 });
  });
  it("parses 6-digit hex", () => {
    expect(parseColor("#00ff80")).toEqual({ r: 0, g: 255, b: 128, a: 1 });
  });
  it("parses 3-digit hex", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });
  it("parses named white/black", () => {
    expect(parseColor("white")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("black")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
  it("returns null for unrecognized input", () => {
    expect(parseColor("chartreuse-ish")).toBeNull();
  });

  it("parses 8-digit hex with alpha", () => {
    expect(parseColor("#ffcc0080")).toEqual({ r: 255, g: 204, b: 0, a: 128 / 255 });
  });

  it("is case-insensitive for hex", () => {
    expect(parseColor("#FFF")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });
});

const palette: ThemePalette = [
  { var: "--_theme---background", rgba: { r: 0, g: 0, b: 0, a: 1 } },
  { var: "--_theme---text", rgba: { r: 255, g: 255, b: 255, a: 1 } },
];

describe("mapColor", () => {
  it("maps white to the closest theme var with zero distance", () => {
    expect(mapColor("white", palette)).toEqual({ themeVar: "--_theme---text", distance: 0 });
  });
  it("ignores alpha when matching", () => {
    expect(mapColor("rgba(255,255,255,0.3)", palette)).toEqual({ themeVar: "--_theme---text", distance: 0 });
  });
  it("maps a near-black to the background var", () => {
    const m = mapColor("#0a0a0a", palette);
    expect(m?.themeVar).toBe("--_theme---background");
  });
  it("returns null for an empty palette", () => {
    expect(mapColor("white", [])).toBeNull();
  });
  it("returns null for an unparseable color", () => {
    expect(mapColor("not-a-color", palette)).toBeNull();
  });
});
