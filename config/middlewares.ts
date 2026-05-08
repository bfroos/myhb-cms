export default ({ env }) => {
  const toHost = (url?: string) =>
    url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";

  // Current media host (new) + optional previous media host (old)
  // Explicitly include both R2 custom domains for CSP compatibility with Admin UI
  const mediaHosts = [
    toHost(env("CF_PUBLIC_ACCESS_URL")),
    toHost(env("CF_PUBLIC_ACCESS_URL_OLD")),
    "media.myhb.app",
    "media.myhealthandbeauty.app",
  ].filter(Boolean);

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
// Forced rebuild 1778233047
