import 'dotenv/config';

const requiredForEmbedded = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET'];
const requiredForAdminReads = ['SHOPIFY_SHOP_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN'];
const defaultScopes = ['read_themes', 'read_apps'];

export function getRuntimeConfig() {
  const shopDomain = normalizeShopDomain(process.env.SHOPIFY_SHOP_DOMAIN || '');
  const requiredScopes = parseList(process.env.SHOPIFY_REQUIRED_SCOPES || defaultScopes.join(','));
  const missingRequired = [
    ...missing(requiredForEmbedded),
    ...missing(requiredForAdminReads)
  ];

  return {
    appName: 'VIBEMODO Stack Cleaner',
    configured: missingRequired.length === 0,
    missingRequired,
    requiredScopes,
    appBridge: {
      configured: requiredForEmbedded.every((key) => Boolean(process.env[key])),
      apiKeyPresent: Boolean(process.env.SHOPIFY_API_KEY)
    },
    adminApi: {
      configured: requiredForAdminReads.every((key) => Boolean(process.env[key])),
      shopDomainPresent: Boolean(shopDomain),
      tokenPresent: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      apiVersion: process.env.SHOPIFY_API_VERSION || '2026-01'
    },
    themeScan: {
      configured: Boolean(process.env.SHOPIFY_THEME_ID),
      themeIdPresent: Boolean(process.env.SHOPIFY_THEME_ID),
      requirement: 'SHOPIFY_THEME_ID is required to inspect layout/theme.liquid through GraphQL theme(id).files.'
    },
    storefront: {
      url: process.env.STOREFRONT_URL || (shopDomain ? `https://${shopDomain}` : null)
    },
    remediation: {
      mutationsEnabled: false,
      approvalGate: 'Store mutations are disabled until an explicit approval gate is implemented.'
    }
  };
}

export function getPrivateConfig() {
  const publicConfig = getRuntimeConfig();

  return {
    ...publicConfig,
    shopDomain: normalizeShopDomain(process.env.SHOPIFY_SHOP_DOMAIN || ''),
    accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2026-01',
    themeId: process.env.SHOPIFY_THEME_ID || '',
    storefrontUrl: process.env.STOREFRONT_URL || publicConfig.storefront.url,
    installedSignatures: parseJsonArray(process.env.INSTALLED_APP_SIGNATURES_JSON || '[]')
  };
}

export function assertConfigured() {
  const config = getPrivateConfig();

  if (!config.configured) {
    const error = new Error(`Missing required Shopify configuration: ${config.missingRequired.join(', ')}`);
    error.status = 428;
    error.requirements = config.missingRequired;
    throw error;
  }

  return config;
}

function missing(keys) {
  return keys.filter((key) => !process.env[key]);
}

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeShopDomain(value) {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
}
