import { chromium as chromiumReBrowser, type LaunchOptions } from 'rebrowser-playwright';
import { chromium } from 'playwright';

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
