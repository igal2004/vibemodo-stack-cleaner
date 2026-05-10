import compression from 'compression';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyScripts, extractExternalScripts, summarizeScripts } from '../src/lib/scanner.js';
import { assertEmbeddedConfigured, buildShopifyAdminConfig, getPrivateConfig, getRuntimeConfig } from './config.mjs';
import {
  consumeOAuthState,
  deleteOfflineSession,
  ensureSessionStorage,
  getOfflineSession,
  getSessionStorageStatus,
  saveOAuthState,
  saveOfflineSession
} from './session-store.mjs';
import { exchangeOfflineToken, loadShopContext, loadThemeLiquid } from './shopify.mjs';

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

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'vibemodo-stack-cleaner',
    sessionStorage: getSessionStorageStatus()
  });
});

app.get('/ready', (_request, response) => {
  const config = getRuntimeConfig();
  response.status(config.configured ? 200 : 428).json({
    ready: config.configured,
    missingRequired: config.missingRequired
  });
});

app.get('/privacy', (_request, response) => {
  response.type('html').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>VIBEMODO Stack Cleaner Privacy</title></head>
  <body>
    <main>
      <h1>VIBEMODO Stack Cleaner Privacy</h1>
      <p>This app performs read-only Shopify storefront and theme script audits when configured.</p>
      <p>Secrets, access tokens, and session tokens are not exposed in the UI, docs, or audit logs.</p>
      <p>Customer data request, customer redact, and shop redact webhooks are present for Shopify compliance routing.</p>
    </main>
  </body>
</html>`);
});

app.get('/auth', (request, response) => {
  const config = getRuntimeConfig();
  const shop = String(request.query.shop || '').trim();

  if (!config.appBridge.configured) {
    response.status(428).json({
      message: 'OAuth cannot start until SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOPIFY_APP_URL are configured.',
      missingRequired: config.missingRequired
    });
    return;
  }

  if (!shop.endsWith('.myshopify.com')) {
    response.status(400).json({ message: 'Valid shop query parameter is required.' });
    return;
  }

  const appUrl = process.env.SHOPIFY_APP_URL || process.env.RENDER_APP_URL;
  const scopes = config.requiredScopes.join(',');
  const redirectUri = `${appUrl}/auth/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  saveOAuthState({ state, shopDomain: shop });

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', process.env.SHOPIFY_API_KEY);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  response.redirect(url.toString());
});

app.get('/auth/callback', async (request, response) => {
  const valid = verifyShopifyQueryHmac(request.query, process.env.SHOPIFY_API_SECRET || '');

  if (!valid) {
    response.status(401).json({ message: 'Shopify OAuth callback HMAC verification failed.' });
    return;
  }

  const shop = String(request.query.shop || '').trim();
  const code = String(request.query.code || '').trim();
  const state = String(request.query.state || '').trim();

  if (!shop.endsWith('.myshopify.com') || !code || !consumeOAuthState({ state, shopDomain: shop })) {
    response.status(401).json({ message: 'Shopify OAuth callback state validation failed.' });
    return;
  }

  try {
    await ensureSessionStorage();
    const token = await exchangeOfflineToken({
      shopDomain: shop,
      code,
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecret: process.env.SHOPIFY_API_SECRET
    });
    await saveOfflineSession({
      shopDomain: shop,
      accessToken: token.accessToken,
      scope: token.scope
    });

    response.redirect(`/?shop=${encodeURIComponent(shop)}`);
  } catch (error) {
    response.status(error.status || 500).json({
      message: error.message,
      status: 'blocked',
      nextRequirement: 'Verify Shopify Partner app credentials, callback URL parity, and DATABASE_URL session storage before wet-test signoff.'
    });
  }
});

app.post(
  ['/webhooks/app/uninstalled', '/webhooks/customers/data_request', '/webhooks/customers/redact', '/webhooks/shop/redact'],
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const verified = verifyWebhookHmac(request.body, request.get('X-Shopify-Hmac-Sha256'), process.env.SHOPIFY_API_SECRET || '');

    if (!verified) {
      response.status(401).json({ message: 'Webhook HMAC verification failed.' });
      return;
    }

    if (request.path === '/webhooks/app/uninstalled') {
      await deleteOfflineSession(request.get('X-Shopify-Shop-Domain'));
    }

    response.status(200).json({ ok: true });
  }
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/config', (_request, response) => {
  response.json(getRuntimeConfig());
});

app.get('/api/install/status', async (request, response) => {
  const shop = resolveShopFromRequest(request);
  const session = await getOfflineSession(shop);
  const storage = getSessionStorageStatus();

  response.json({
    shop,
    installed: Boolean(session),
    status: session ? (storage.configuredForWetTest ? 'Wet-test pending' : 'Local only') : 'Blocked',
    sessionStorage: storage,
    requirements: session
      ? []
      : ['Install the app through Shopify OAuth on the dev store before running an embedded runtime scan.']
  });
});

app.post('/api/scan', async (request, response) => {
  const auditTrail = [];

  try {
    assertEmbeddedConfigured();
    auditTrail.push(info('config', 'Required embedded Shopify configuration is present.'));

    const config = await resolveScanConfig(request);
    auditTrail.push(info('session', `Using ${config.sessionSource} Shopify Admin token source.`));

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

async function resolveScanConfig(request) {
  const shop = resolveShopFromRequest(request);
  const session = await getOfflineSession(shop);

  if (session) {
    return {
      ...buildShopifyAdminConfig({
        shopDomain: session.shopDomain,
        accessToken: session.accessToken
      }),
      storefrontUrl: process.env.STOREFRONT_URL || `https://${session.shopDomain}`,
      sessionSource: getSessionStorageStatus().mode
    };
  }

  const fallback = getPrivateConfig();

  if (fallback.adminApi.configured) {
    return {
      ...fallback,
      sessionSource: 'env-admin-token-fallback'
    };
  }

  const error = new Error('No Shopify OAuth offline session is installed for this shop, and no explicit Admin API fallback token is configured.');
  error.status = 428;
  error.requirements = [
    'Install the app through /auth on the Render URL for the dev store.',
    'Set DATABASE_URL for wet-test-valid session storage.',
    'Do not mark wet-test passed while using memory session storage.'
  ];
  throw error;
}

function resolveShopFromRequest(request) {
  return normalizeShopDomain(
    request.query.shop ||
      process.env.SHOPIFY_DEV_STORE_DOMAIN ||
      process.env.DEV_STORE_DOMAIN ||
      process.env.SHOPIFY_SHOP_DOMAIN ||
      ''
  );
}

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

function verifyShopifyQueryHmac(query, secret) {
  if (!secret || !query.hmac) return false;

  const rest = { ...query };
  const hmac = rest.hmac;
  delete rest.hmac;
  delete rest.signature;
  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${Array.isArray(rest[key]) ? rest[key].join(',') : rest[key]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');

  return safeEqual(String(hmac), digest);
}

function verifyWebhookHmac(body, header, secret) {
  if (!secret || !header || !body) return false;

  const digest = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return safeEqual(String(header), digest);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeShopDomain(value) {
  return String(value || '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
}
