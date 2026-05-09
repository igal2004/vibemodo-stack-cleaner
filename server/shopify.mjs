export async function adminGraphql(config, query, variables = {}) {
  const endpoint = `https://${config.shopDomain}/admin/api/${config.apiVersion}/graphql.json`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(`Shopify Admin GraphQL HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (payload?.errors?.length) {
    const error = new Error(payload.errors.map((item) => item.message).join('; '));
    error.status = 502;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function loadShopContext(config) {
  return adminGraphql(
    config,
    `#graphql
    query StackCleanerShopContext {
      shop {
        id
        name
        myshopifyDomain
        primaryDomain {
          host
          url
        }
      }
      app {
        title
        installation {
          accessScopes {
            handle
          }
        }
      }
    }`
  );
}

export async function loadThemeLiquid(config) {
  if (!config.themeId) {
    return {
      skipped: true,
      requirement: 'SHOPIFY_THEME_ID is missing; cannot call GraphQL theme(id).files for layout/theme.liquid.'
    };
  }

  const payload = await adminGraphql(
    config,
    `#graphql
    query StackCleanerThemeLiquid($themeId: ID!, $filenames: [String!]!) {
      theme(id: $themeId) {
        id
        name
        role
        files(filenames: $filenames, first: 1) {
          nodes {
            filename
            contentType
            checksumMd5
            updatedAt
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
              ... on OnlineStoreThemeFileBodyBase64 {
                contentBase64
              }
              ... on OnlineStoreThemeFileBodyUrl {
                url
              }
            }
          }
          userErrors {
            code
            filename
          }
        }
      }
    }`,
    { themeId: config.themeId, filenames: ['layout/theme.liquid'] }
  );

  return {
    skipped: false,
    theme: payload.data.theme,
    file: payload.data.theme?.files?.nodes?.[0] || null,
    userErrors: payload.data.theme?.files?.userErrors || []
  };
}
