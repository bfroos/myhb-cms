export default ({ env }) => ({
  upload: {
    config: {
      provider: "strapi-provider-cloudflare-r2",
      providerOptions: {
        accessKeyId: env("CF_ACCESS_KEY_ID"),
        secretAccessKey: env("CF_ACCESS_SECRET"),
        endpoint: env("CF_ENDPOINT"),
        params: {
          Bucket: env("CF_BUCKET"),
        },
        cloudflarePublicAccessUrl: env("CF_PUBLIC_ACCESS_URL"),
        pool: false,
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
      breakpoints: {
        large: 800,
        medium: 600,
        small: 420,
      },
    },
  },
  "amount-cents": {
    enabled: true,
    resolve: "./src/plugins/amount-cents",
  },
  translate: {
    enabled: true,
    resolve: "./node_modules/strapi-plugin-translate",
    config: {
      provider: "deepl",
      providerOptions: {
        apiKey: env("DEEPL_API_KEY"),
        // strapi-provider-translate-deepl@1.3.0-next.4 has a hardcoded
        // allowlist of target locales in its parseLocale() switch-case, and
        // it's stale: "AR" (Arabic) is missing even though DeepL's actual API
        // supports it. localeMap is the documented escape hatch — an entry
        // here is checked before the allowlist throws "unsupported locale".
        localeMap: {
          AR: "AR",
        },
      },
    },
  },
});
