import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractExternalScripts, removeScriptTag } from '../worker/liquid-worker.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(root, 'fixtures/rendered-store.html');
const source = await fs.readFile(fixturePath, 'utf8');
const scripts = extractExternalScripts(source);

if (!scripts.length) {
  throw new Error('Liquify Audit failed: fixture did not expose any external scripts.');
}

const protectedLiquidMarkers = ['{{ content_for_header }}', '{{ content_for_layout }}'];
const sampleTheme = `
<!doctype html>
<html>
  <head>
    {{ content_for_header }}
    <script src="https://cdn.abandoned-cart-pro.com/recover.js"></script>
  </head>
  <body>{{ content_for_layout }}</body>
</html>`;

const cleaned = removeScriptTag(sampleTheme, 'https://cdn.abandoned-cart-pro.com/recover.js');

for (const marker of protectedLiquidMarkers) {
  if (!cleaned.includes(marker)) {
    throw new Error(`Liquify Audit failed: protected Liquid marker removed: ${marker}`);
  }
}

if (cleaned.includes('abandoned-cart-pro.com')) {
  throw new Error('Liquify Audit failed: target orphan script was not removed.');
}

console.log(`Liquify Audit passed: ${scripts.length} script tags scanned, protected Liquid markers intact.`);
