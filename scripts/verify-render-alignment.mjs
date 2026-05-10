import fs from 'node:fs';

const args = new Set(process.argv.slice(2));
const expectedRenderUrl = process.env.RENDER_APP_URL || process.env.SHOPIFY_APP_URL || 'https://vibemodo-stack-cleaner.onrender.com';
const devStore = process.env.SHOPIFY_DEV_STORE_DOMAIN || process.env.DEV_STORE_DOMAIN || 'vibemodo-seo-test.myshopify.com';
const files = [
  '.env.example',
  'render.yaml',
  'shopify.app.render.example.toml',
  'docs/DEV_STORE_WET_TEST.md',
  'docs/SHOPIFY_APP_CONFIGURATION.md',
  'docs/RENDER_DEPLOYMENT.md',
  'docs/OPERATING_FLOW.md',
  'docs/PROGRESS_STATUS.md'
];

const activeShopifyConfigExists = fs.existsSync('shopify.app.render.toml');
const checkedText = files
  .filter((file) => fs.existsSync(file))
  .map((file) => `${file}\n${fs.readFileSync(file, 'utf8')}`)
  .join('\n');
const runtimeConfigText = [
  '.env.example',
  'render.yaml',
  'shopify.app.render.toml',
  'shopify.app.render.example.toml'
]
  .filter((file) => fs.existsSync(file))
  .map((file) => `${file}\n${fs.readFileSync(file, 'utf8')}`)
  .join('\n');

const failures = [];
const warnings = [];

if (!expectedRenderUrl.startsWith('https://') || !expectedRenderUrl.includes('.onrender.com')) {
  failures.push('SHOPIFY_APP_URL/RENDER_APP_URL must be an HTTPS Render URL.');
}

if (!checkedText.includes('vibemodo-stack-cleaner')) {
  failures.push('Render service name vibemodo-stack-cleaner is not documented.');
}

if (!checkedText.includes(devStore)) {
  failures.push(`Dev store ${devStore} is not documented.`);
}

if (!checkedText.includes(`${expectedRenderUrl}/auth/callback`)) {
  failures.push('Render OAuth callback URL is not documented.');
}

if (/\bngrok\b|railway\.app|up\.railway\.app|localhost:\d+/i.test(runtimeConfigText)) {
  failures.push('A checked deployment/runtime document still references ngrok, Railway, or localhost as an active Shopify runtime target.');
}

if (!activeShopifyConfigExists) {
  warnings.push('shopify.app.render.toml is not present; only shopify.app.render.example.toml exists until Partner app details are available.');
}

if (!process.env.SHOPIFY_APP_URL) {
  warnings.push('SHOPIFY_APP_URL is not set in the current process; env parity cannot be verified live.');
}

if (!process.env.DATABASE_URL) {
  warnings.push('DATABASE_URL is not set in the current process; wet-test-valid OAuth session storage cannot be verified live.');
}

const status = failures.length ? 'Blocked / Not Render-aligned' : warnings.length ? 'Render alignment pending' : 'Wet-test pending';
const payload = {
  status,
  devStore,
  expectedRenderUrl,
  activeShopifyConfigExists,
  failures,
  warnings,
  wetTestStatus: status === 'Wet-test pending' ? 'Wet-test pending' : 'Blocked / Not Render-aligned'
};

console.log(JSON.stringify(payload, null, 2));

if (args.has('--wet-test-status')) {
  console.log(`Wet-test gate: ${payload.wetTestStatus}`);
}

if (failures.length) {
  process.exitCode = 1;
}
