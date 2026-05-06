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
  // Disabled: @wecre8websites/strapi-page-builder v1.1.2 incompatible with Strapi 5.44
  // Crashes Admin UI sidebar navigation for Single Types.
  // template relation removed from landing-page schema (was only tested, never used in production).
  "page-builder": {
    enabled: false,
  },
});
