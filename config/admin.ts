/**
 * Strapi Admin Configuration
 * Includes Preview feature for frontend content review
 */

const getPreviewPathname = (uid: string, { locale, document }: { locale: string; document: any }): string | null => {
  const { slug, id, documentId } = document ?? {};

  switch (uid) {
    case "api::blog-article.blog-article": {
      if (!slug) return "/blog";
      return `/blog/${slug}`;
    }
    case "api::location.location": {
      const citySlug = document?.city?.slug;
      const locationSlug = document?.slug;
      if (!citySlug || !locationSlug) return "/standorte";
      return `/standorte/${citySlug}/${locationSlug}`;
    }
    case "api::treatment-page.treatment-page": {
      // treatment-page has no location field; use pathKey (e.g. "botox" or "hyaluron/lippen-aufspritzen")
      const pathKey = document?.pathKey;
      if (!pathKey) return null;
      return `/behandlungen/${pathKey}`;
    }
    case "api::landing-page.landing-page": {
      const pageSlug = slug || documentId || id;
      if (!pageSlug) return null;
      return `/lp/${pageSlug}`;
    }
    case "api::homepage.homepage":
      return "/";
    case "api::about-us-page.about-us-page":
      return "/ueber-uns";
    case "api::blog-page.blog-page":
      return "/blog";
    case "api::prices-page.prices-page":
      return "/preise";
    case "api::product.product": {
      if (!slug) return "/produkte";
      return `/produkte/${slug}`;
    }
    case "api::general-page.general-page": {
      const pageSlug = slug || documentId || id;
      if (!pageSlug) return null;
      return `/p/${pageSlug}`;
    }
    case "api::page.page": {
      const pageSlug = slug || documentId || id;
      if (!pageSlug) return null;
      return `/p/${pageSlug}`;
    }
    case "api::job-page.job-page":
      return "/jobs";
    case "api::treatment-ads-page.treatment-ads-page": {
      if (!slug) return "/behandlungen";
      return `/behandlungen/${slug}`;
    }
    case "api::career-page.career-page":
      return "/karriere";
    case "api::city-page.city-page": {
      const citySlug = document?.city?.slug || slug || documentId || id;
      if (!citySlug) return "/standorte";
      return `/standorte/${citySlug}`;
    }
    case "api::doctors-page.doctors-page":
      return "/team";
    case "api::locations-page.locations-page":
      return "/standorte";
    default:
      return null;
  }
};

// Build the correct populate object per content type
function getPopulate(uid: string): Record<string, any> {
  switch (uid) {
    case "api::location.location":
      return { city: { fields: ["slug"] } };
    case "api::treatment-page.treatment-page":
      // No relations needed - pathKey is a direct string field
      return {};
    case "api::city-page.city-page":
      return { city: { fields: ["slug"] } };
    default:
      return {};
  }
}

export default ({ env }) => {
  const clientUrl = env("CLIENT_URL", "https://www.myhealthandbeauty.com");
  const previewSecret = env("PREVIEW_SECRET", "");

  return {
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

    // ADMIN PANEL CSP (CRITICAL FOR THUMBNAIL PREVIEW!)
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'market-assets.strapi.io',
          'strapi-ai-staging.s3.us-east-1.amazonaws.com',
          'strapi-ai-production.s3.us-east-1.amazonaws.com',
          'media.myhb.app',
          'media.myhealthandbeauty.app',
        ],
        'media-src': [
          "'self'",
          'data:',
          'blob:',
          'media.myhb.app',
          'media.myhealthandbeauty.app',
        ],
      },
    },

    preview: {
      enabled: true,
      config: {
        // allowedOrigins must be an array — Strapi uses this as postMessage targetOrigin.
        // Include all origins the preview iframe can run on.
        allowedOrigins: [
          clientUrl,
          'https://go.myhealthandbeauty.com',
          'http://localhost:3000',
          'http://localhost:3001',
        ],

        async handler(uid: string, { documentId, locale, status }: { documentId: string; locale: string; status: string }) {
          const document = await strapi.documents(uid as any).findOne({
            documentId,
            populate: getPopulate(uid),
          });

          const pathname = getPreviewPathname(uid, { locale, document });
          if (!pathname) return null;

          const urlSearchParams = new URLSearchParams({
            url: pathname,
            secret: previewSecret,
            status,
          });

          return `${clientUrl}/api/preview?${urlSearchParams}`;
        },
      },
    },
  };
};
