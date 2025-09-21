import { describe, expect, it } from 'bun:test';
import { scrapeUrl } from './scraper';

describe('scraper', () => {
  it('should scrape a url', async () => {
    const text = await scrapeUrl('https://jobs.ashbyhq.com/causaly/b197dd4a-dded-4f35-ab09-3bf757b64d2a');
    expect(text).toContain('Senior Software Engineer');
  });
});
