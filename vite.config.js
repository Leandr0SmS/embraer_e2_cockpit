import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manualJsonPath = path.resolve(__dirname, 'src/data/manual.json');
const svgFilePath = path.resolve(__dirname, 'painel_svg.svg');

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function manualEditorPlugin() {
  return {
    name: 'manual-editor-plugin',
    configureServer(server) {
      server.middlewares.use('/api/save-manual', (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { id, title, system, description } = JSON.parse(body);
            if (!id) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing control ID' }));
              return;
            }

            const raw = fs.readFileSync(manualJsonPath, 'utf-8');
            const currentManual = JSON.parse(raw);

            currentManual[id] = {
              title: title ?? '',
              system: system ?? '',
              description: description ?? '',
            };

            fs.writeFileSync(
              manualJsonPath,
              JSON.stringify(currentManual, null, 2) + '\n',
              'utf-8'
            );

            // Also keep the <title> tooltip inside painel_svg.svg in sync
            if (fs.existsSync(svgFilePath)) {
              const svgRaw = fs.readFileSync(svgFilePath, 'utf-8');
              const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = new RegExp(
                `(<g id="${escapedId}" class="clickable"><title>)(.*?)(</title>)`
              );
              if (pattern.test(svgRaw)) {
                const updatedSvg = svgRaw.replace(
                  pattern,
                  `$1${escapeXml(title ?? '')}$3`
                );
                fs.writeFileSync(svgFilePath, updatedSvg, 'utf-8');
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, entry: currentManual[id] }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), manualEditorPlugin()],
});
