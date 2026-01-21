/**
 * treatment-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { getLocationStatus } from "../../../utils/locationStatus";
import {
  blockTreatmentTeasersPopulate,
  editorialBlocksPopulate,
} from "../../../utils/queries/blocks";
import {
  treatmentPagePopulateForFindByLocationAndPath,
  treatmentPagePopulateForFindByPath,
} from "../../../utils/queries/treatmentPagePopulate";
import {
  locationFieldsForPage,
  locationPopulateForPage,
} from "../../../utils/queries/locationPopulate";

/**
 * Calculates the cheapest price from treatment's own price and all product variants
 * @param treatment - The treatment object with products and variants
 * @returns The cheapest price in euro cents, or null if no prices found
 */
function calculateCheapestPrice(treatment: any): number | null {
  if (!treatment) return null;

  const prices: number[] = [];

  // Add treatment's own price if it exists
  if (
    treatment.priceInEuroCent !== null &&
    treatment.priceInEuroCent !== undefined
  ) {
    prices.push(treatment.priceInEuroCent);
  }

  // Collect prices from all products and their variants
  if (Array.isArray(treatment.products)) {
    for (const product of treatment.products) {
      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          // Only consider active variants with a valid price
          if (
            variant.isActive === true &&
            variant.priceInEuroCent !== null &&
            variant.priceInEuroCent !== undefined
          ) {
            prices.push(variant.priceInEuroCent);
          }
        }
      }
    }
  }

  // Return the minimum price, or null if no prices found
  return prices.length > 0 ? Math.min(...prices) : null;
}

export default factories.createCoreController(
  "api::treatment-page.treatment-page",
  ({ strapi }) => ({
    /**
     * Returns listed treatment pages grouped by top-level parent (ancestorSlugs[0]).
     *
     * - Only pages with showInMenu=true are included
     * - Only pages with non-empty ancestorSlugs are included (top-level pages are excluded)
     * - Group name is derived from the top-level parent page's `name` (same locale)
     */
    async findListedGroupedByTopParent(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };

      const listedPages = (await strapi
        .documents("api::treatment-page.treatment-page")
        .findMany({
          locale,
          fields: ["slug", "name", "pathKey", "ancestorSlugs"],
          filters: {
            showInMenu: { $eq: true },
            ancestorSlugs: { $notNull: true },
          },
          populate: {
            ...(blockTreatmentTeasersPopulate.populate.treatmentPages
              .populate as object),
          },
          // use a high default limit; callers can still override via pagination if needed later
          limit: 9999,
        })) as Array<{
        id: number;
        slug?: string;
        name?: string;
        pathKey?: string;
        ancestorSlugs?: unknown;
      }>;

      // Exclude top-level pages (no ancestorSlugs or empty array)
      const pagesWithAncestors = listedPages.filter((p) => {
        if (!Array.isArray(p.ancestorSlugs)) return false;
        return (
          p.ancestorSlugs.length > 0 && typeof p.ancestorSlugs[0] === "string"
        );
      }) as Array<{
        id: number;
        slug?: string;
        name?: string;
        pathKey?: string;
        ancestorSlugs: string[];
      }>;

      const topParentSlugs = Array.from(
        new Set(pagesWithAncestors.map((p) => p.ancestorSlugs[0])),
      );

      const topParents = (
        topParentSlugs.length
          ? await strapi
              .documents("api::treatment-page.treatment-page")
              .findMany({
                locale,
                fields: ["slug", "name"],
                filters: {
                  slug: {
                    $in: topParentSlugs,
                  },
                },
                limit: topParentSlugs.length,
              })
          : []
      ) as Array<{ slug?: string; name?: string }>;

      const topParentNameBySlug = new Map(
        topParents
          .filter((p) => typeof p.slug === "string")
          .map((p) => [p.slug as string, p.name || ""] as const),
      );

      const grouped = new Map<
        string,
        {
          groupId: string;
          groupName: string;
          treatmentPages: typeof pagesWithAncestors;
        }
      >();

      for (const page of pagesWithAncestors) {
        const groupId = page.ancestorSlugs[0];
        const groupName = topParentNameBySlug.get(groupId) ?? "";

        const existing = grouped.get(groupId);
        if (existing) {
          existing.treatmentPages.push(page);
        } else {
          grouped.set(groupId, {
            groupId,
            groupName,
            treatmentPages: [page],
          });
        }
      }

      return {
        data: Array.from(grouped.values()).sort((a, b) =>
          (a.groupName || a.groupId).localeCompare(
            b.groupName || b.groupId,
            "de",
          ),
        ),
      };
    },

    /**
     * Find a treatment page by its hierarchical path
     * Path format: "botox/baby-botox" or "botox"
     *
     * Locale is passed as query parameter: ?locale=de|en|...
     */
    async findByPath(ctx: Context) {
      const { path } = ctx.params as {
        path: string | string[];
      };
      const { locale } = ctx.query as { locale?: string };

      const pathSegments = Array.isArray(path) ? path : [path];
      const pathKey = pathSegments.filter(Boolean).join("/");

      const page = await strapi
        .documents("api::treatment-page.treatment-page")
        .findFirst({
          filters: {
            pathKey: { $eq: pathKey },
          },
          locale,
          populate: {
            ...(treatmentPagePopulateForFindByPath as object),
            blocks: {
              on: {
                ...(editorialBlocksPopulate.on as object),
              },
            },
          },
        });
      if (!page) return ctx.notFound("Treatment page not found");

      // Calculate cheapestPriceInEuroCent from products and variants
      if ((page as any).treatment) {
        const treatment = (page as any).treatment as any;
        treatment.cheapestPriceInEuroCent = calculateCheapestPrice(treatment);
      }

      // Fetch ancestor treatmentPages if ancestorSlugs exist
      let ancestors: Array<{ slug: string; name: string }> = [];
      if (
        (page as any).ancestorSlugs &&
        Array.isArray((page as any).ancestorSlugs) &&
        (page as any).ancestorSlugs.length > 0
      ) {
        const ancestorSlugs = (page as any).ancestorSlugs as string[];
        const ancestorPages = await strapi
          .documents("api::treatment-page.treatment-page")
          .findMany({
            locale,
            fields: ["slug", "name"],
            filters: {
              slug: {
                $in: ancestorSlugs,
              },
            },
            limit: ancestorSlugs.length,
          });

        // Map ancestors in the order of ancestorSlugs
        ancestors = ancestorSlugs.map((slug: string) => {
          const ancestor = (ancestorPages as any[]).find(
            (p: any) => p.slug === slug,
          );
          return ancestor
            ? { slug: ancestor.slug, name: ancestor.name }
            : { slug, name: "" };
        });
      }

      return {
        data: {
          ...(page as any),
          ancestors,
        },
      };
    },

    /**
     * Find a treatment page and location by citySlug, locationSlug and treatmentPathKey
     *
     * Locale is passed as query parameter: ?locale=de|en|...
     */
    async findByLocationAndPath(ctx: Context) {
      const { citySlug, locationSlug, treatmentPathKey } = ctx.params as {
        citySlug: string;
        locationSlug: string;
        treatmentPathKey: string | string[];
      };
      const { locale } = ctx.query as { locale?: string };

      // Handle treatmentPathKey as array or string
      const pathKeySegments = Array.isArray(treatmentPathKey)
        ? treatmentPathKey
        : [treatmentPathKey];
      const pathKey = pathKeySegments.filter(Boolean).join("/");

      // Fetch location
      const location = await strapi
        .documents("api::location.location")
        .findFirst({
          locale,
          fields: locationFieldsForPage as any,
          filters: {
            slug: {
              $eq: locationSlug,
            },
            city: {
              slug: {
                $eq: citySlug,
              },
            },
          },
          populate: {
            ...(locationPopulateForPage as object),
          },
        });

      if (!location) {
        ctx.notFound("Location not found");
        return;
      }

      // Fetch treatment page by pathKey
      const treatmentPage = await strapi
        .documents("api::treatment-page.treatment-page")
        .findFirst({
          locale,
          filters: {
            pathKey: {
              $eq: pathKey,
            },
          },
          fields: ["slug", "pathKey", "name", "ancestorSlugs"],
          populate: {
            ...(treatmentPagePopulateForFindByLocationAndPath as object),
          },
        });

      if (!treatmentPage) {
        ctx.notFound("Treatment page not found");
        return;
      }

      // Fetch ancestor treatmentPages if ancestorSlugs exist
      let ancestors: Array<{ slug: string; name: string }> = [];
      if (
        treatmentPage.ancestorSlugs &&
        Array.isArray(treatmentPage.ancestorSlugs) &&
        treatmentPage.ancestorSlugs.length > 0
      ) {
        const ancestorSlugs = treatmentPage.ancestorSlugs as string[];
        const ancestorPages = await strapi
          .documents("api::treatment-page.treatment-page")
          .findMany({
            locale,
            fields: ["slug", "name"],
            filters: {
              slug: {
                $in: ancestorSlugs,
              },
            },
            limit: ancestorSlugs.length,
          });

        // Map ancestors in the order of ancestorSlugs
        ancestors = ancestorSlugs.map((slug: string) => {
          const ancestor = ancestorPages.find(
            (page: any) => page.slug === slug,
          );
          return ancestor
            ? { slug: ancestor.slug, name: ancestor.name }
            : { slug, name: "" };
        });
      }

      // Add ancestors to treatmentPage
      const treatmentPageWithAncestors = {
        ...treatmentPage,
        ancestors,
      };

      // Add openingStatus to location
      const locationOpenStatus = getLocationStatus(
        location.newOpeningDate,
        location.timezone || "Europe/Berlin",
      );

      const locationWithStatus = {
        ...location,
        openingStatus: locationOpenStatus,
      };

      return {
        data: {
          location: locationWithStatus,
          treatmentPage: treatmentPageWithAncestors,
        },
      };
    },
  }),
);
