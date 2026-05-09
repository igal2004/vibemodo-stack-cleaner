export function extractExternalScripts(html, source = 'storefront_html', file = null) {
  const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  const scripts = [];
  let match;

  while ((match = pattern.exec(html || '')) !== null) {
    const src = match[1];
    const url = toUrl(src);

    if (url && url.protocol.startsWith('http')) {
      scripts.push({
        src,
        host: url.hostname,
        path: `${url.pathname}${url.search}`,
        source,
        file,
        status: 'unattributed',
        owner: null,
        remediationEligible: false
      });
    }
  }

  return dedupeScripts(scripts);
}

export function classifyScripts(scripts, installedSignatures = []) {
  return scripts.map((script) => {
    const owner = installedSignatures.find((signature) => {
      const hostMatch = signature.domains?.includes(script.host);
      const tokenMatch = signature.signatures?.some((token) => script.src.includes(token));
      return hostMatch && tokenMatch;
    });

    if (owner) {
      return {
        ...script,
        status: 'attributed',
        owner: owner.name,
        remediationEligible: false,
        reason: 'Matched configured installed-app signature.'
      };
    }

    return {
      ...script,
      status: 'unattributed',
      owner: null,
      remediationEligible: Boolean(script.file),
      reason: installedSignatures.length
        ? 'No configured installed-app signature matched.'
        : 'Installed app signature inventory is not configured; cannot claim orphan status.'
    };
  });
}

export function summarizeScripts(scripts, themeFilesInspected = 0) {
  return {
    totalScripts: scripts.length,
    attributedScripts: scripts.filter((script) => script.status === 'attributed').length,
    unattributedScripts: scripts.filter((script) => script.status === 'unattributed').length,
    themeFilesInspected
  };
}

function dedupeScripts(scripts) {
  const byKey = new Map();

  for (const script of scripts) {
    const key = `${script.src}:${script.source}:${script.file || ''}`;
    byKey.set(key, script);
  }

  return [...byKey.values()];
}

function toUrl(src) {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}
