export interface SplitResult {
  html: string;
  css: string;
}

/** Split a Lumos section's inline `<style>` block out: returns the markup (style removed) + the CSS. */
export function splitStyle(combinedHtml: string): SplitResult {
  const block = combinedHtml.match(/[ \t]*<style>[\s\S]*?<\/style>\n?/);
  if (!block) return { html: combinedHtml, css: "" };
  const inner = block[0].match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const html = combinedHtml.replace(block[0], "");
  return { html, css: inner.trim() };
}
