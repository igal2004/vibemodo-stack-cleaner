import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyScripts, extractExternalScripts, summarizeScripts } from '../src/lib/scanner.js';
import { assertConfigured, getRuntimeConfig } from './config.mjs';
import { loadShopContext, loadThemeLiquid } from './shopify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.shopify.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://cdn.shopify.com'],
        connectSrc: ["'self'", 'https://admin.shopify.com', 'https://*.myshopify.com'],
        frameAncestors: ['https://admin.shopify.com', 'https://*.myshopify.com']
      }
    }
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.get('/api/config', (_request, response) => {
  response.json(getRuntimeConfig());
});

app.post('/api/scan', async (_request, response) => {
  const auditTrail = [];

  try {
    const config = assertConfigured();
    auditTrail.push(info('config', 'Required Shopify configuration is present.'));

    const shopContext = await loadShopContext(config);
    auditTrail.push(info('shopify_admin_graphql', 'Loaded shop context and current app access scopes from Admin GraphQL.'));

    const storefrontHtml = await fetchStorefrontHtml(config.storefrontUrl);
    auditTrail.push(info('storefront_html', `Fetched rendered storefront HTML from ${config.storefrontUrl}.`));

    const storefrontScripts = extractExternalScripts(storefrontHtml, 'storefront_html');
    let themeScripts = [];
    let themeFilesInspected = 0;
    const requirements = [];

    try {
      const themeLiquid = await loadThemeLiquid(config);
      if (themeLiquid.skipped) {
        requirements.push(themeLiquid.requirement);
        auditTrail.push(warn('shopify_admin_graphql', themeLiquid.requirement));
      } else if (themeLiquid.file?.body?.content) {
        themeFilesInspected = 1;
        themeScripts = extractExternalScripts(themeLiquid.file.body.content, 'theme_liquid', themeLiquid.file.filename);
        auditTrail.push(info('shopify_admin_graphql', 'Inspected layout/theme.liquid through GraphQL theme(id).files.'));
      } else {
        auditTrail.push(warn('shopify_admin_graphql', 'theme.liquid content was not returned. Verify read_themes scope and SHOPIFY_THEME_ID.'));
      }
    } catch (error) {
      requirements.push(`Theme scan failed: ${error.message}`);
      auditTrail.push(errorEntry('shopify_admin_graphql', `Theme scan failed: ${error.message}`));
    }

    if (!config.installedSignatures.length) {
      requirements.push('INSTALLED_APP_SIGNATURES_JSON is not configured; scripts can be listed but not claimed as orphaned.');
      auditTrail.push(warn('installed_app_signatures', 'No installed-app signature inventory configured; no orphan claim will be made.'));
    }

    const scripts = classifyScripts([...storefrontScripts, ...themeScripts], config.installedSignatures);

    response.json({
      status: 'complete',
      shop: shopContext.data.shop,
      app: {
        title: shopContext.data.app?.title,
        grantedScopes: shopContext.data.app?.installation?.accessScopes?.map((scope) => scope.handle) || []
      },
      summary: summarizeScripts(scripts, themeFilesInspected),
      scripts,
      auditTrail,
      requirements
    });
  } catch (error) {
    response.status(error.status || 500).json({
      status: 'blocked',
      message: error.message,
      requirements: error.requirements || ['Review server logs and Shopify API response.'],
      scripts: [],
      summary: null,
      auditTrail: [
        ...auditTrail,
        errorEntry('scan', error.message)
      ]
    });
  }
});

app.post('/api/remediate', (request, response) => {
  const { scriptSrc, file } = request.body || {};

  if (!scriptSrc) {
    response.status(400).json({ message: 'scriptSrc is required to stage remediation.' });
    return;
  }

  response.status(202).json({
    status: 'staged',
    mutationBlocked: true,
    scriptSrc,
    file: file || 'unknown',
    message: 'A remediation task was staged for review only. No Shopify theme mutation was performed.',
    approvalGate: 'Implement explicit merchant approval, backup creation, diff preview, and rollback before enabling write_themes mutations.'
  });
});

app.use(express.static(path.join(root, 'dist'), { index: false }));
app.get(/.*/, async (_request, response) => {
  const html = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
  response.type('html').send(html.replaceAll('__SHOPIFY_API_KEY__', process.env.SHOPIFY_API_KEY || ''));
});

app.listen(port, () => {
  console.log(`VIBEMODO Stack Cleaner listening on ${port}`);
});

async function fetchStorefrontHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'VIBEMODO Stack Cleaner read-only audit'
    }
  });

  if (!response.ok) {
    throw new Error(`Storefront HTML fetch failed with HTTP ${response.status}`);
  }

  return response.text();
}

function info(source, message) {
  return { level: 'info', source, message, at: new Date().toISOString() };
}

function warn(source, message) {
  return { level: 'warning', source, message, at: new Date().toISOString() };
}

function errorEntry(source, message) {
  return { level: 'error', source, message, at: new Date().toISOString() };
}
