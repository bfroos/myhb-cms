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
      const citySlug = document?.location?.city?.slug;
      const locationSlug = document?.location?.slug;
      const treatmentSlug = document?.slug;
      if (!citySlug || !locationSlug || !treatmentSlug) return null;
      return `/standorte/${citySlug}/${locationSlug}/${treatmentSlug}`;
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
      return `/${pageSlug}`;
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

    preview: {
      enabled: true,
      config: {
        allowedOrigins: clientUrl,

        async handler(uid: string, { documentId, locale, status }: { documentId: string; locale: string; status: string }) {
          const document = await strapi.documents(uid as any).findOne({
            documentId,
            populate: {
              city: { fields: ["slug"] },
              location: {
                populate: { city: { fields: ["slug"] } },
                fields: ["slug"],
              },
            },
          });

          const pathname = getPreviewPathname(uid, { locale, document });
          if (!pathname) return null;

          // Build the preview URL pointing to the Nuxt /api/preview route
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
