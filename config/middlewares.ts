export default ({ env }) => {
  const toHost = (url?: string) =>
    url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";

  // Current media host (new) + optional previous media host (old)
  const mediaHosts = [
    toHost(env("CF_PUBLIC_ACCESS_URL")),
    toHost(env("CF_PUBLIC_ACCESS_URL_OLD")),
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
