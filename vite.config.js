import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy injected into the production index.html only.
// (Dev mode is excluded because the React Fast Refresh preamble is an inline script.)
// - script-src 'self' + https://www.googletagmanager.com + SHA-256 hash of the inline
//   gtag config script: blocks any unapproved inline scripts or on*="" handlers (defence
//   in depth for the inline SVG injected via dangerouslySetInnerHTML in src/App.jsx)
//   while permitting Google Analytics (GA4).
// - style-src 'unsafe-inline': required because react-zoom-pan-pinch injects a <style> tag.
// - img-src data:: the cockpit SVG embeds PNG images as base64 data URIs.
export function buildCsp(html = '') {
  const inlineScriptHashes = [];
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/gi)) {
    const hash = createHash('sha256').update(match[1], 'utf8').digest('base64');
    inlineScriptHashes.push(`'sha256-${hash}'`);
  }

  const scriptSrc = [
    "'self'",
    'https://www.googletagmanager.com',
    ...inlineScriptHashes,
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
    "font-src 'self'",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

const cspPlugin = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp(html) },
        injectTo: 'head-prepend',
      },
    ];
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin()],
});
