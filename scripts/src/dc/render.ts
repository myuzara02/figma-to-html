import { chromium } from "playwright";

export interface RenderOptions {
  foundationCss: string;
  width?: number;
}

/** Render Lumos markup (with the foundation CSS inlined; the markup keeps its own <style>) to a screenshot. */
export async function renderToScreenshot(
  markupHtml: string,
  outPath: string,
  opts: RenderOptions,
): Promise<void> {
  const width = opts.width ?? 1440;
  const doc = `<!doctype html>
<html>
  <head><meta charset="utf-8"><style>${opts.foundationCss}</style></head>
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
