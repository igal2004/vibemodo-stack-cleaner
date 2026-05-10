import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const memorySessions = new Map();
const stateStore = new Map();
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL_DISABLED === 'true' ? false : { rejectUnauthorized: false }
    })
  : null;

export function getSessionStorageStatus() {
  return {
    mode: pool ? 'database' : 'memory',
    configuredForWetTest: Boolean(pool),
    localOnlyFallback: !pool
  };
}

export async function ensureSessionStorage() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopify_sessions (
      shop_domain TEXT PRIMARY KEY,
      access_token_ciphertext TEXT NOT NULL,
      scope TEXT NOT NULL,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveOfflineSession({ shopDomain, accessToken, scope }) {
  const normalizedShop = normalizeShopDomain(shopDomain);
  const encryptedToken = encryptSecret(accessToken);

  if (pool) {
    await ensureSessionStorage();
    await pool.query(
      `INSERT INTO shopify_sessions (shop_domain, access_token_ciphertext, scope, installed_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (shop_domain)
       DO UPDATE SET access_token_ciphertext = EXCLUDED.access_token_ciphertext, scope = EXCLUDED.scope, updated_at = NOW()`,
      [normalizedShop, encryptedToken, scope || '']
    );
    return;
  }

  memorySessions.set(normalizedShop, {
    accessTokenCiphertext: encryptedToken,
    scope: scope || '',
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function getOfflineSession(shopDomain) {
  const normalizedShop = normalizeShopDomain(shopDomain);

  if (!normalizedShop) return null;

  if (pool) {
    await ensureSessionStorage();
    const result = await pool.query(
      'SELECT shop_domain, access_token_ciphertext, scope, installed_at, updated_at FROM shopify_sessions WHERE shop_domain = $1',
      [normalizedShop]
    );
    const row = result.rows[0];

    if (!row) return null;

    return {
      shopDomain: row.shop_domain,
      accessToken: decryptSecret(row.access_token_ciphertext),
      scope: row.scope,
      installedAt: row.installed_at,
      updatedAt: row.updated_at
    };
  }

  const record = memorySessions.get(normalizedShop);

  if (!record) return null;

  return {
    shopDomain: normalizedShop,
    accessToken: decryptSecret(record.accessTokenCiphertext),
    scope: record.scope,
    installedAt: record.installedAt,
    updatedAt: record.updatedAt
  };
}

export async function deleteOfflineSession(shopDomain) {
  const normalizedShop = normalizeShopDomain(shopDomain);

  if (!normalizedShop) return;

  if (pool) {
    await pool.query('DELETE FROM shopify_sessions WHERE shop_domain = $1', [normalizedShop]);
    return;
  }

  memorySessions.delete(normalizedShop);
}

export function saveOAuthState({ state, shopDomain }) {
  const normalizedShop = normalizeShopDomain(shopDomain);
  stateStore.set(state, {
    shopDomain: normalizedShop,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
}

export function consumeOAuthState({ state, shopDomain }) {
  const normalizedShop = normalizeShopDomain(shopDomain);
  const record = stateStore.get(state);
  stateStore.delete(state);

  if (!record) return false;
  if (record.expiresAt < Date.now()) return false;

  return record.shopDomain === normalizedShop;
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
  const [ivPart, tagPart, encryptedPart] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function encryptionKey() {
  const source = process.env.SESSION_SECRET || process.env.SHOPIFY_API_SECRET || 'local-development-only-session-key';
  return crypto.createHash('sha256').update(source).digest();
}

function normalizeShopDomain(value) {
  return String(value || '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
}
