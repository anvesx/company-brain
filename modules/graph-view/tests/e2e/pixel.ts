import type { Browser, Page } from "@playwright/test";

/**
 * RGB of a 1x1 screenshot of the page's bottom-right corner, decoded by Chromium itself (no image
 * library). The graph canvas fills the page and nodes settle near the centre, so the corner is background.
 */
export async function cornerPixel(browser: Browser, page: Page): Promise<number[]> {
  const size = page.viewportSize() ?? { width: 1280, height: 800 };
  const png = await page.screenshot({ clip: { x: size.width - 3, y: size.height - 3, width: 1, height: 1 } });
  const blank = await browser.newPage();
  const rgb = await blank.evaluate(
    async (src) => {
      const img = Object.assign(new Image(), { src });
      await img.decode();
      const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d");
      ctx?.drawImage(img, 0, 0);
      return [...(ctx?.getImageData(0, 0, 1, 1).data ?? [])].slice(0, 3);
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );
  await blank.close();
  return rgb;
}

/** Of the pixels in the canvas area that are not black, the share that is near white (every channel above 235): what bloom washes out. */
export async function whiteShare(browser: Browser, page: Page): Promise<number> {
  const png = await page.screenshot({ clip: { x: 240, y: 48, width: 700, height: 600 } });
  const blank = await browser.newPage();
  const share = await blank.evaluate(
    async (src) => {
      const img = Object.assign(new Image(), { src });
      await img.decode();
      const ctx = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }).getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const d = ctx?.getImageData(0, 0, img.width, img.height).data ?? [];
      let lit = 0;
      let white = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.max(d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0) > 40) lit++;
        if (Math.min(d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0) > 235) white++;
      }
      return lit === 0 ? 0 : white / lit;
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );
  await blank.close();
  return share;
}
