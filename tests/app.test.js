// Application & configuration integrity tests (App.jsx, Modal.jsx, index.html, vite.config.js)
import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import pkg from '../package.json';
import viteConfig from '../vite.config.js';

const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const modalSrc = readFileSync(new URL('../src/components/Modal.jsx', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('App.jsx & Modal.jsx structure', () => {
  it('renders the initial Welcome & Disclaimer modal with mandatory AFM/AOM/QRH notice', () => {
    expect(appSrc).toContain('showDisclaimer');
    expect(appSrc).toContain('Disclaimer — For Informational Use Only');
    expect(appSrc).toContain('Airplane Flight Manual (AFM)');
    expect(appSrc).toContain('Aircraft Operating Manual (AOM)');
    expect(appSrc).toContain('QRH');
  });

  it('includes the footer with author link, dynamic package version, and Disclaimer trigger', () => {
    expect(appSrc).toContain('<footer className="app-footer">');
    expect(appSrc).toContain('Leandro Simões');
    expect(appSrc).toContain('Release v{pkg.version}');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(appSrc).toContain('setShowDisclaimer(true)');
  });

  it('memoizes InlineCockpitSvg and syncs <title> tooltip on hover', () => {
    expect(appSrc).toContain('const InlineCockpitSvg = memo(');
    expect(appSrc).toContain('handleSvgMouseOver');
    expect(appSrc).toContain('dangerouslySetInnerHTML={{ __html: painelSvgRaw }}');
  });

  it('Modal.jsx supports Escape key dismissal, backdrop close, and system badge rendering', () => {
    expect(modalSrc).toContain("e.key === 'Escape'");
    expect(modalSrc).toContain('e.stopPropagation()');
    expect(modalSrc).toContain('data.system');
    expect(modalSrc).toContain('data.title');
    expect(modalSrc).toContain('data.description');
  });
});

describe('index.html & Vite production CSP', () => {
  it('references ./img/favicon.jpg (served from public/img/favicon.jpg)', () => {
    expect(indexHtml).toContain('href="./img/favicon.jpg"');
    expect(indexHtml).not.toContain('/public/');
    const faviconFile = new URL('../public/img/favicon.jpg', import.meta.url);
    expect(existsSync(faviconFile)).toBe(true);
  });

  it('injects a strict Content-Security-Policy meta tag during production builds', () => {
    const cspPlugin = viteConfig.plugins.find((p) => p && p.name === 'inject-csp');
    expect(cspPlugin).toBeDefined();
    expect(cspPlugin.apply).toBe('build');

    const tags = cspPlugin.transformIndexHtml();
    expect(tags).toHaveLength(1);
    expect(tags[0].tag).toBe('meta');
    expect(tags[0].attrs['http-equiv']).toBe('Content-Security-Policy');
    expect(tags[0].attrs.content).toContain("script-src 'self'");
    expect(tags[0].attrs.content).toContain("object-src 'none'");
    expect(tags[0].attrs.content).toContain("img-src 'self' data:");
  });
});

