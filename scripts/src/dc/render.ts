import { chromium } from "playwright";

export interface RenderOptions {
  foundationCss: string;
  /** Per-component CSS (when the markup's <style> has been split into a separate file). */
  componentCss?: string;
  width?: number;
}

/** Render Lumos markup (with the foundation + optional component CSS inlined) to a full-page screenshot. */
export async function renderToScreenshot(
  markupHtml: string,
  outPath: string,
  opts: RenderOptions,
): Promise<void> {
  const width = opts.width ?? 1440;
  const css = opts.componentCss ? `${opts.foundationCss}\n${opts.componentCss}` : opts.foundationCss;
  const doc = `<!doctype html>
<html>
  <head><meta charset="utf-8"><style>${css}</style></head>
  <body>${markupHtml}</body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(doc, { waitUntil: "load" });
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
}
