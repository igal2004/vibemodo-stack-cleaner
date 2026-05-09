export function extractExternalScripts(html) {
  const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  const scripts = [];
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const src = match[1];
    const url = toUrl(src);

    if (url && url.protocol.startsWith('http')) {
      scripts.push({
        src,
        host: url.hostname,
        path: `${url.pathname}${url.search}`,
        tag: match[0],
        index: match.index
      });
    }
  }

  return scripts;
}

export function classifyScripts(html, installedApps) {
  return extractExternalScripts(html).map((script) => {
    const match = findInstalledApp(script, installedApps);
    const risk = match ? 'managed' : estimateRisk(script);

    return {
      ...script,
      appName: match?.name || inferLegacyApp(script),
      appId: match?.id || null,
      status: match ? 'active' : 'orphan',
      confidence: match ? 'high' : inferConfidence(script),
      latencyMs: estimateLatency(script),
      risk
    };
  });
}

export function summarizeScan(items) {
  const orphanScripts = items.filter((item) => item.status === 'orphan');
  const latencyImpact = orphanScripts.reduce((total, item) => total + item.latencyMs, 0);
  const activeScripts = items.length - orphanScripts.length;

  return {
    totalScripts: items.length,
    activeScripts,
    orphanScripts: orphanScripts.length,
    latencyImpact,
    healthScore: Math.max(42, 96 - orphanScripts.length * 13 - Math.round(latencyImpact / 30))
  };
}

export function createThemeBackup(themeLiquid, reason) {
  return {
    id: `backup_${Date.now()}`,
    reason,
    createdAt: new Date().toISOString(),
    file: 'layout/theme.liquid',
    content: themeLiquid
  };
}

export function safelyRemoveScript(themeLiquid, scriptSrc) {
  const escaped = escapeRegExp(scriptSrc);
  const tagPattern = new RegExp(`\\n?\\s*<script\\b[^>]*\\bsrc=["']${escaped}["'][^>]*>\\s*<\\/script>`, 'i');

  if (!tagPattern.test(themeLiquid)) {
    return {
      changed: false,
      themeLiquid,
      warning: 'Script tag was not found in theme.liquid. No removal was made.'
    };
  }

  return {
    changed: true,
    themeLiquid: themeLiquid.replace(tagPattern, ''),
    warning: null
  };
}

function findInstalledApp(script, installedApps) {
  return installedApps.find((app) => {
    const domainMatch = app.domains.includes(script.host);
    const signatureMatch = app.signatures.some((signature) => script.src.includes(signature));

    return domainMatch && signatureMatch;
  });
}

function inferLegacyApp(script) {
  if (script.host.includes('abandoned-cart')) return 'Abandoned Cart Pro';
  if (script.host.includes('loyaltypilot')) return 'LoyaltyPilot';
  return 'Unknown legacy app';
}

function estimateRisk(script) {
  if (script.host.includes('googletagmanager')) return 'review';
  if (script.src.includes('checkout') || script.src.includes('payment')) return 'blocked';
  return 'safe-delete-candidate';
}

function inferConfidence(script) {
  if (script.host.includes('cdn.') || script.host.includes('shopify')) return 'medium';
  return 'high';
}

function estimateLatency(script) {
  const base = script.src.length % 45;
  if (script.host.includes('googletagmanager')) return 54 + base;
  if (script.host.includes('cdn.shopify.com')) return 38 + base;
  return 62 + base;
}

function toUrl(src) {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
