import { chromium as chromiumReBrowser, type LaunchOptions } from 'rebrowser-playwright';
import { chromium, type Page } from 'playwright';

export async function createReBrowser(options?: LaunchOptions) {
  return chromiumReBrowser.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: false,
    ...options,
  });
}

export async function createBrowser(options?: LaunchOptions) {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    ...options,
  });
}

export const A4_WIDTH_PX = 794; // 210mm at 96 DPI
export const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI
export async function getPageInfo(page: Page) {
  return page.evaluate(
    ([usableHeight]) => {
      if (!usableHeight) {
        throw new Error('usableHeight is not defined');
      }
      const contentHeight = document.documentElement.scrollHeight;
      const numberOfPages = Math.ceil(contentHeight / usableHeight);

      return {
        contentHeight,
        usableHeight,
        numberOfPages,
        exceedsOnePage: numberOfPages > 1,
      };
    },
    [A4_HEIGHT_PX]
  );
}
