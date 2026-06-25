import { describe, it, expect } from "vitest";
import { detectRole } from "../../src/dc/role";

describe("detectRole", () => {
  it("classifies a zero-height vector as a divider even when it has an asset", () => {
    // real case: node 4388:3415 is a Vector 6 with h=0 carrying the line's SVG asset
    expect(detectRole({ type: "vector", rect: { w: 440, h: 0 }, hasChildren: false, assetVar: "imgVector6" })).toBe("divider");
  });
  it("classifies an element with an asset as an image", () => {
    expect(detectRole({ type: "frame", rect: { w: 200, h: 200 }, hasChildren: false, assetVar: "imgPhoto" })).toBe("image");
  });
  it("classifies a non-thin vector with no asset as an image", () => {
    expect(detectRole({ type: "vector", rect: { w: 100, h: 100 }, hasChildren: false })).toBe("image");
  });
  it("classifies a text node as text", () => {
    expect(detectRole({ type: "text", rect: { w: 330, h: 70 }, hasChildren: false })).toBe("text");
  });
  it("classifies a frame with children as a container", () => {
    expect(detectRole({ type: "frame", rect: { w: 440, h: 222 }, hasChildren: true })).toBe("container");
  });
  it("classifies a childless frame as unknown", () => {
    expect(detectRole({ type: "frame", rect: { w: 10, h: 10 }, hasChildren: false })).toBe("unknown");
  });
});
