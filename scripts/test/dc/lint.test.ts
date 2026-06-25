import { describe, it, expect } from "vitest";
import { lintLumos } from "../../src/dc/lint";

describe("lintLumos — structural rules", () => {
  it("passes clean Lumos markup with no style block", () => {
    const html = `<section class="hero_wrap u-section"><div class="hero_layout u-grid-above"></div></section>`;
    expect(lintLumos(html)).toEqual([]);
  });
  it("flags inline style attributes as error", () => {
    const issues = lintLumos(`<div style="color:red"></div>`);
    expect(issues).toContainEqual({ rule: "no-inline-style", match: "style=", severity: "error" });
  });
  it("flags >3-underscore component classes as error", () => {
    const issues = lintLumos(`<div class="card_testimonial_visual_icon_img"></div>`);
    expect(issues).toContainEqual({ rule: "max-3-underscores", match: "card_testimonial_visual_icon_img", severity: "error" });
  });
  it("does not flag utility classes for underscores", () => {
    const issues = lintLumos(`<div class="u-text-style-h2"></div>`);
    expect(issues.filter((i) => i.rule === "max-3-underscores")).toEqual([]);
  });
});

describe("lintLumos — px two-tier", () => {
  it("errors on px within tolerance of a spacing token, with suggestion", () => {
    const issues = lintLumos(`<style>.a{gap:16px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "16px", severity: "error", suggestion: "use var(--_spacing---space--3)" });
  });
  it("errors on px 1px off a token (within 2px tolerance)", () => {
    const issues = lintLumos(`<style>.a{gap:25px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "25px", severity: "error", suggestion: "use var(--_spacing---space--4)" });
  });
  it("flags px far from any token (no suggestion)", () => {
    const issues = lintLumos(`<style>.a{border-width:1px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "1px", severity: "flag" });
  });
  it("flags px inside decorative blur/shadow even if it equals a token", () => {
    const issues = lintLumos(`<style>.a{filter:blur(40px)}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "40px", severity: "flag" });
    const shadow = lintLumos(`<style>.a{box-shadow:0 2px 0 #000}</style>`);
    expect(shadow).toContainEqual({ rule: "no-px", match: "2px", severity: "flag" });
  });
  it("does not check rem values", () => {
    const issues = lintLumos(`<style>.a{padding:1.5rem}</style>`);
    expect(issues.filter((i) => i.rule === "no-px")).toEqual([]);
  });
});

describe("lintLumos — color two-tier", () => {
  it("errors on a translucent neutral fill, suggesting color-mix on a theme var", () => {
    const issues = lintLumos(`<style>.a{color:rgba(255,255,255,0.5)}</style>`);
    expect(issues).toContainEqual({
      rule: "raw-color",
      match: "rgba(255,255,255,0.5)",
      severity: "error",
      suggestion: "use color-mix(in hsl, var(--_theme---background) 50%, transparent)",
    });
  });
  it("errors on an opaque neutral fill, suggesting a theme var", () => {
    const issues = lintLumos(`<style>.a{background:#0a0a0a}</style>`);
    expect(issues).toContainEqual({
      rule: "no-hex",
      match: "#0a0a0a",
      severity: "error",
      suggestion: "use var(--_theme---text)",
    });
  });
  it("flags an off-palette brand hex (no close theme var)", () => {
    const issues = lintLumos(`<style>.a{background:#fa5401}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#fa5401", severity: "flag" });
  });
  it("flags a desaturated brand mint as a chromatic accent", () => {
    const issues = lintLumos(`<style>.a{color:#aed8d2}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#aed8d2", severity: "flag" });
  });
  it("flags a neutral color used in a decorative shadow", () => {
    const issues = lintLumos(`<style>.a{box-shadow:0 2px 0 rgba(255,255,255,0.06)}</style>`);
    expect(issues).toContainEqual({ rule: "raw-color", match: "rgba(255,255,255,0.06)", severity: "flag" });
  });
  it("flags a neutral color in a non-fill property", () => {
    const issues = lintLumos(`<style>.a{outline-width:0;caret-color:#ffffff}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#ffffff", severity: "flag" });
  });
  it("does not flag color-mix on theme vars (no raw literal present)", () => {
    const issues = lintLumos(`<style>.a{color:color-mix(in hsl, var(--_theme---text) 30%, transparent)}</style>`);
    expect(issues.filter((i) => i.rule === "no-hex" || i.rule === "raw-color")).toEqual([]);
  });
});
