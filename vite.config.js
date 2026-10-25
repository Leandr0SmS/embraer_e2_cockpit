import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy injected into the production index.html only.
// (Dev mode is excluded because the React Fast Refresh preamble is an inline script.)
// - script-src 'self': blocks inline scripts / on*="" handlers, defence in depth for the
//   inline SVG injected via dangerouslySetInnerHTML in src/App.jsx.
// - style-src 'unsafe-inline': required because react-zoom-pan-pinch injects a <style> tag.
// - img-src data:: the cockpit SVG embeds PNG images as base64 data URIs.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml() {
    return [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ];
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin()],
});
