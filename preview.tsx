#!/usr/bin/env bun
import { loadCV } from '@/services/cv';
import { generateCSS, generateHTML } from '@/services/ssg';
import { serve } from 'bun';

const DEFAULT_CV_PATH = 'cv.yaml';

const server = serve({
  port: 5173,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/app.css') {
      const css = await generateCSS();
      return new Response(css, {
        headers: { 'content-type': 'text/css', 'cache-control': 'no-store' },
      });
    }

    const cv = await loadCV(DEFAULT_CV_PATH);
    const html = await generateHTML({ cv, mode: 'preview' });
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.info(`🚀 Server running at ${server.url}`);
