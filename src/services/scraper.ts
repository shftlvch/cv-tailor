import * as cheerio from 'cheerio';
import { createBrowser } from './browser';

export const scrapeUrl = async (url: string, opts: { visualise: boolean } = { visualise: false }) => {
  const browser = await createBrowser({ headless: !opts.visualise });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'load' });
    // Additional wait to ensure all content is loaded
    // await page.waitForLoadState('networkidle');
    const html = await page.content();
    const text = await extractTextFromHtml(html);
    return text;
  } finally {
    await browser.close();
  }
};

export const extractTextFromHtml = async (html: string) => {
  const $ = cheerio.load(html);
  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .cookie, .social-share').remove();
  $('body').find('script, style, nav, header, footer, noscript, svg').remove();
  $('body').find('*').removeAttr('style id class');
  const body = $('body').html();
  if (!body) {
    throw new Error('No body found in HTML');
  }
  const text = body
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove multiple consecutive periods
    .replace(/\.{3,}/g, '...')
    // Remove excessive line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  return text;
};
