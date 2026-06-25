import { describe, it, expect } from "vitest";
import { lintLumos } from "../../src/dc/lint";

describe("lintLumos", () => {
  it("passes clean Lumos markup", () => {
    const html = `<section class="hero_wrap u-section"><div class="hero_layout u-grid-above"></div></section>`;
    expect(lintLumos(html)).toEqual([]);
  });
  it("flags px units", () => {
    const issues = lintLumos(`<style>.a{gap:16px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "16px" });
  });
  it("flags hex colors", () => {
    const issues = lintLumos(`<style>.a{color:#ff0000}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#ff0000" });
  });
  it("flags inline style attributes", () => {
    const issues = lintLumos(`<div style="color:red"></div>`);
    expect(issues.some((i) => i.rule === "no-inline-style")).toBe(true);
  });
  it("flags component classes with more than 3 underscores", () => {
    const issues = lintLumos(`<div class="card_testimonial_visual_icon_img"></div>`);
    expect(issues).toContainEqual({ rule: "max-3-underscores", match: "card_testimonial_visual_icon_img" });
  });
  it("does not flag utility classes for underscores", () => {
    const issues = lintLumos(`<div class="u-text-style-h2"></div>`);
    expect(issues.filter((i) => i.rule === "max-3-underscores")).toEqual([]);
  });
});
