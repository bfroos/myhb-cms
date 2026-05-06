/**
 * Strapi Admin Configuration
 * Includes Preview feature for frontend content review
 */

// Generate preview pathname based on content type and document
const getPreviewPathname = (uid: string, { locale, document }: { locale: string; document: any }): string | null => {
  const { slug, id, documentId } = document ?? {};

  switch (uid) {
    // Blog articles → /blog/{slug}
    case "api::blog-article.blog-article": {
      if (!slug) return "/blog";
      return `/blog/${slug}`;
    }

    // Locations → /standorte/{citySlug}/{locationSlug}
    case "api::location.location": {
      const citySlug = document?.city?.slug;
      const locationSlug = document?.slug;
      if (!citySlug || !locationSlug) return "/standorte";
      return `/standorte/${citySlug}/${locationSlug}`;
    }

    // Treatment pages → /standorte/{citySlug}/{locationSlug}/{treatmentSlug}
    case "api::treatment-page.treatment-page": {
      const citySlug = document?.location?.city?.slug;
      const locationSlug = document?.location?.slug;
      const treatmentSlug = document?.slug;
      if (!citySlug || !locationSlug || !treatmentSlug) return null;
      return `/standorte/${citySlug}/${locationSlug}/${treatmentSlug}`;
    }

    // Landing pages → /lp/{slug} or /lp/{documentId} as fallback
    case "api::landing-page.landing-page": {
      const pageSlug = slug || documentId || id;
      if (!pageSlug) return null;
      return `/lp/${pageSlug}`;
    }

    // Homepage → /
    case "api::homepage.homepage": {
      return "/";
    }

    // About Us → /ueber-uns
    case "api::about-us-page.about-us-page": {
      return "/ueber-uns";
    }

    // Blog overview → /blog
    case "api::blog-page.blog-page": {
      return "/blog";
    }

    // Prices → /preise
    case "api::prices-page.prices-page": {
      return "/preise";
    }

    // Products → /produkte/{slug}
    case "api::product.product": {
      if (!slug) return "/produkte";
      return `/produkte/${slug}`;
    }

    // General page → /{slug}
    case "api::general-page.general-page": {
      const pageSlug = slug || documentId || id;
      if (!pageSlug) return null;
      return `/${pageSlug}`;
    }

    // Job page → /jobs
    case "api::job-page.job-page": {
      return "/jobs";
    }

    // Treatment ads page → /behandlungen
    case "api::treatment-ads-page.treatment-ads-page": {
      return "/behandlungen";
    }

    // Career page → /karriere
    case "api::career-page.career-page": {
      return "/karriere";
    }

    // City page → /standorte/{citySlug}
    case "api::city-page.city-page": {
      const citySlug = document?.city?.slug || slug || documentId || id;
      if (!citySlug) return "/standorte";
      return `/standorte/${citySlug}`;
    }

    // Doctors page → /team
    case "api::doctors-page.doctors-page": {
      return "/team";
    }

    // Locations page → /standorte
    case "api::locations-page.locations-page": {
      return "/standorte";
    }

    // No preview for other content types (menu, redirect, global, etc.)
    default:
      return null;
  }
};

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

  // ── PREVIEW FEATURE ────────────────────────────────────────────────
  preview: {
    enabled: true,
    config: {
      // Allow preview from the main frontend domain (www)
      allowedOrigins: env("CLIENT_URL", "https://www.myhealthandbeauty.com"),

      async handler(uid: string, { documentId, locale, status }: { documentId: string; locale: string; status: string }) {
        // Fetch the document with relevant relations
        const document = await strapi.documents(uid as any).findOne({
          documentId,
          populate: {
            city: { fields: ["slug"] },
            location: {
              populate: {
                city: { fields: ["slug"] },
              },
              fields: ["slug"],
            },
          },
        });

        const pathname = getPreviewPathname(uid, { locale, document });

        // No preview configured for this content type
        if (!pathname) return null;

        const clientUrl = env("CLIENT_URL", "https://www.myhealthandbeauty.com");

        // Use Nuxt preview mode: append ?preview=true for drafts
        const url = new URL(`${clientUrl}${pathname}`);
        if (status === "draft") {
          url.searchParams.set("preview", "true");
        }

        return url.toString();
      },
    },
  },
});
