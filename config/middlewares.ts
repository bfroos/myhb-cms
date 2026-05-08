export default ({ env }) => {
  const toHost = (url?: string) =>
    url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";

  // Hardcoded R2 custom domains for CSP (fallback if env vars fail)
  const hardcodedMediaHosts = [
    "media.myhb.app",
    "media.myhealthandbeauty.app",
  ];

  // Try to load from env vars, fallback to hardcoded
  const envMediaHosts = [
    toHost(env("CF_PUBLIC_ACCESS_URL")),
    toHost(env("CF_PUBLIC_ACCESS_URL_OLD")),
  ].filter(Boolean);

  // Use env vars if available, otherwise hardcoded
  const mediaHosts = envMediaHosts.length > 0 ? envMediaHosts : hardcodedMediaHosts;

  // Debug log (visible in Strapi Cloud logs)
  console.log("[CSP DEBUG] Media hosts for CSP:", mediaHosts);

  return [
    "strapi::logger",
    "strapi::errors",
    {
      name: "strapi::security",
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            "connect-src": ["'self'", "https:"],
            "img-src": [
              "'self'",
              "data:",
              "blob:",
              "market-assets.strapi.io",
              "strapi-ai-staging.s3.us-east-1.amazonaws.com",
              "strapi-ai-production.s3.us-east-1.amazonaws.com",
              ...mediaHosts,
            ],
            "media-src": [
              "'self'",
              "data:",
              "blob:",
              "market-assets.strapi.io",
              ...mediaHosts,
            ],
            // Allow frontend domains to be embedded in iframes for Preview feature
            "frame-src": [
              "'self'",
              env("CLIENT_URL", "https://www.myhealthandbeauty.com"),
              env("CLIENT_URL_ADS", "https://go.myhealthandbeauty.com"),
            ],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    "strapi::cors",
    "strapi::poweredBy",
    "strapi::query",
    "strapi::body",
    "strapi::session",
    "strapi::favicon",
    "strapi::public",
  ];
};
