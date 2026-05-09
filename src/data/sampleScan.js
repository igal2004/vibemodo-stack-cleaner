export const renderedHtml = String.raw`
<!doctype html>
<html>
  <head>
    <script src="https://cdn.shopify.com/extensions/klaviyo-onsite/onsite.js"></script>
    <script src="https://cdn.reviews.io/widget/product-widget.js"></script>
    <script src="https://www.googletagmanager.com/gtm.js?id=GTM-STORE01"></script>
    <script src="https://cdn.abandoned-cart-pro.com/recover.js"></script>
    <script src="https://cdn.loyaltypilot.io/snippet.js"></script>
  </head>
  <body>
    <main>VIBEMODO demo storefront</main>
  </body>
</html>`;

export const themeLiquid = String.raw`
<!doctype html>
<html>
  <head>
    {{ content_for_header }}
    <script src="https://cdn.shopify.com/extensions/klaviyo-onsite/onsite.js"></script>
    <script src="https://cdn.reviews.io/widget/product-widget.js"></script>
    <script src="https://www.googletagmanager.com/gtm.js?id=GTM-STORE01"></script>
    <script src="https://cdn.abandoned-cart-pro.com/recover.js"></script>
    <script src="https://cdn.loyaltypilot.io/snippet.js"></script>
  </head>
  <body>
    {{ content_for_layout }}
  </body>
</html>`;

export const installedApps = [
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    domains: ['cdn.shopify.com'],
    signatures: ['klaviyo-onsite']
  },
  {
    id: 'google-tag-manager',
    name: 'Google Tag Manager',
    domains: ['www.googletagmanager.com'],
    signatures: ['GTM-STORE01']
  },
  {
    id: 'reviews-io',
    name: 'REVIEWS.io',
    domains: ['cdn.reviews.io'],
    signatures: ['product-widget']
  }
];
