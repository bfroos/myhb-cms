const localePrefix = (locale: string): string =>
  locale && locale !== "de" ? `/${locale}` : "";

type StaticPreviewConfig = {
  type: "static";
  pathByLocale: Record<string, string>;
};

type DynamicPreviewConfig = {
  type: "dynamic";
  pathBuilder: (
    document: Record<string, unknown>,
    locale: string
  ) => string | null;
  requiresDocument: true;
};

type PreviewConfig = StaticPreviewConfig | DynamicPreviewConfig;

const PREVIEW_REGISTRY: Record<string, PreviewConfig> = {
  "api::about-us-page.about-us-page": {
    type: "static",
    pathByLocale: {
      de: "ueber-uns",
      en: "about-us",
      tr: "hakkimizda",
      ar: "man-nahnu",
    },
  },

  "api::page.page": {
    type: "dynamic",
    requiresDocument: true,
    pathBuilder: (doc) => {
      const slug = doc.slug as string | undefined;
      if (!slug) return null;
      return `/p/${slug}`;
    },
  },
};

function buildPreviewPathname(
  uid: string,
  config: PreviewConfig,
  locale: string,
  document?: Record<string, unknown>
): string | null {
  const prefix = localePrefix(locale);

  if (config.type === "static") {
    const segment = config.pathByLocale[locale] ?? config.pathByLocale.de;
    return `${prefix}/${segment}`;
  }

  if (config.type === "dynamic" && document) {
    const path = config.pathBuilder(document, locale);
    if (!path) return null;
    return `${prefix}${path}`;
  }

  return null;
}

export default ({ env }) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET"),
  },
  apiToken: {
    salt: env("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: env("TRANSFER_TOKEN_SALT"),
    },
  },
  secrets: {
    encryptionKey: env("ENCRYPTION_KEY"),
  },
  flags: {
    nps: env.bool("FLAG_NPS", true),
    promoteEE: env.bool("FLAG_PROMOTE_EE", true),
  },
  preview: {
    enabled: true,
    config: {
      allowedOrigins: env("CLIENT_URL"),
      async handler(
        uid: string,
        {
          documentId,
          locale,
          status,
        }: { documentId: string; locale: string; status: string }
      ) {
        const config = PREVIEW_REGISTRY[uid];
        if (!config) return null;

        const resolvedLocale = locale || "de";
        let document: Record<string, unknown> | undefined;

        if (config.type === "dynamic" && config.requiresDocument) {
          const doc = await (strapi.documents as any)(uid).findOne({
            documentId,
            locale: resolvedLocale,
            status: status as "draft" | "published",
          });
          document = doc as Record<string, unknown>;
        }

        const pathname = buildPreviewPathname(
          uid,
          config,
          resolvedLocale,
          document
        );
        if (!pathname) return null;

        const clientUrl = (env("CLIENT_URL") || "").replace(/\/+$/, "");
        const previewSecret = env("PREVIEW_SECRET");
        if (!clientUrl) return null;

        const params = new URLSearchParams({
          secret: previewSecret || "",
          url: pathname,
          status,
        });
        return `${clientUrl}/api/preview?${params}`;
      },
    },
  },
});
