import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultBackupDir = process.env.BACKUP_DIR || path.resolve(__dirname, '../backups');

export function extractExternalScripts(html) {
  const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  const scripts = [];
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const src = match[1];
    const url = safeUrl(src);

    if (url?.protocol.startsWith('http')) {
      scripts.push({
        src,
        host: url.hostname,
        path: `${url.pathname}${url.search}`,
        tag: match[0]
      });
    }
  }

  return scripts;
}

export function identifyOrphanScripts(html, installedApps) {
  return extractExternalScripts(html).map((script) => {
    const owner = installedApps.find((app) => {
      return app.domains.includes(script.host) && app.signatures.some((signature) => script.src.includes(signature));
    });

    return {
      ...script,
      owner: owner?.name || null,
      orphan: !owner,
      reason: owner ? 'Matched installed app signature' : 'No installed app signature matched'
    };
  });
}

export async function backupThemeLiquid(themeLiquid, metadata = {}, backupDir = defaultBackupDir) {
  await fs.mkdir(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const liquidPath = path.join(backupDir, `${stamp}-theme.liquid`);
  const manifestPath = path.join(backupDir, `${stamp}-manifest.json`);

  await fs.writeFile(liquidPath, themeLiquid, 'utf8');
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        file: 'layout/theme.liquid',
        liquidPath,
        ...metadata
      },
      null,
      2
    ),
    'utf8'
  );

  return { liquidPath, manifestPath };
}

export async function rollbackThemeLiquid(liquidPath) {
  return fs.readFile(liquidPath, 'utf8');
}

export function removeScriptTag(themeLiquid, scriptSrc) {
  const escaped = scriptSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\n?\\s*<script\\b[^>]*\\bsrc=["']${escaped}["'][^>]*>\\s*<\\/script>`, 'i');

  if (!pattern.test(themeLiquid)) {
    throw new Error(`Script tag not found in theme.liquid: ${scriptSrc}`);
  }

  return themeLiquid.replace(pattern, '');
}

export async function throttleShopifyRequest(requestFn, delayMs = Number(process.env.SCAN_RATE_LIMIT_MS || 650)) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return requestFn();
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const htmlPath = process.argv[2] || path.resolve(__dirname, '../fixtures/rendered-store.html');
  const appsPath = process.argv[3] || path.resolve(__dirname, '../fixtures/installed-apps.json');

  const [html, appsJson] = await Promise.all([fs.readFile(htmlPath, 'utf8'), fs.readFile(appsPath, 'utf8')]);
  const report = identifyOrphanScripts(html, JSON.parse(appsJson));

  console.log(JSON.stringify({ scannedAt: new Date().toISOString(), scripts: report }, null, 2));
}
