export default ({ env }) => {
  const toHost = (value?: string) => {
    if (!value) return "";

    const source = value.trim().replace(/\/$/, "");
    if (!source) return "";

    try {
      return new URL(source).host;
    } catch {
      return source.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    }
  };

  const toHostList = (value?: string) =>
    (value ?? "")
      .split(",")
      .map(toHost)
      .filter(Boolean);

  // Hardcoded R2 custom domains for CSP (fallback if env vars fail)
  const hardcodedMediaHosts = [
    "media.myhb.app",
    "media.myhealthandbeauty.app",
  ];

  // Try to load from env vars, fallback to hardcoded
  const envMediaHosts = [
    toHost(env("CF_PUBLIC_ACCESS_URL")),
    toHost(env("CF_PUBLIC_ACCESS_URL_OLD")),
    toHost(env("CF_ENDPOINT")),
    ...toHostList(env("MEDIA_LIBRARY_CSP_HOSTS")),
    "*.r2.dev",
    "*.r2.cloudflarestorage.com",
    "imagedelivery.net",
  ].filter(Boolean);

  // Use env vars if available, otherwise hardcoded
  const mediaHosts = Array.from(
    new Set(envMediaHosts.length > 0 ? envMediaHosts : hardcodedMediaHosts),
  );

  // Debug log (visible in Strapi Cloud logs)
  console.log("[CSP DEBUG] Media hosts for CSP:", mediaHosts);

  return [
    "strapi::logger",
    "strapi::errors",
    {
      name: "strapi::security",
      config: {
        contentSecurityPolicy: {
          useDefaults: false, // CRITICAL: Must be false to override img-src!
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
            "frame-src": [
              "'self'",
              env("CLIENT_URL", "https://www.myhealthandbeauty.com"),
              env("CLIENT_URL_ADS", "https://go.myhealthandbeauty.com"),
            ],
            // Strapi defaults (must include manually when useDefaults: false)
            "default-src": ["'self'"],
            "base-uri": ["'self'"],
            "font-src": ["'self'", "https:", "data:"],
            "form-action": ["'self'"],
            "frame-ancestors": ["'self'"],
            "object-src": ["'none'"],
            "script-src": ["'self'"],
            "script-src-attr": ["'none'"],
            "style-src": ["'self'", "https:", "'unsafe-inline'"],
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
