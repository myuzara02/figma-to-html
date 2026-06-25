import { describe, it, expect } from "vitest";
import { splitStyle } from "../../src/dc/split-style";

describe("splitStyle", () => {
  it("extracts the style block into css and removes it from the markup", () => {
    const combined = `<section class="x_wrap u-section">
  <style>
    .x_a { color: red; }
  </style>
  <div class="x_a"></div>
</section>`;
    const { html, css } = splitStyle(combined);
    expect(html).not.toContain("<style>");
    expect(html).toContain('<div class="x_a">');
    expect(css).toBe(".x_a { color: red; }");
  });

  it("returns the markup unchanged and empty css when there is no style block", () => {
    const combined = `<section class="x_wrap"><div></div></section>`;
    expect(splitStyle(combined)).toEqual({ html: combined, css: "" });
  });
});
