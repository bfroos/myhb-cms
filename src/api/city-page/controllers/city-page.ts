/**
 * city-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import {
  editorialBlocksPopulate,
  headerPageBlocksPopulate,
} from "../../../utils/queries/blocks";
import { getLocationStatus } from "../../../utils/locationStatus";
import { locationTeaserPopulate } from "../../../utils/queries/ui";
import { seoPopulate } from "../../../utils/queries/components";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::city-page.city-page",
  ({ strapi }) => ({
    /**
     * Returns a city (by slug) including its locations (grouped by openingStatus),
     * plus the city-page singleton (seo + blocks).
     */
    async findByCitySlugWithLocations(ctx: Context) {
      const { citySlug } = ctx.params as {
        citySlug: string;
      };
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const cityPage = await strapi
        .documents("api::city-page.city-page")
        .findFirst({
          locale,
          status,
          populate: {
            seo: {
              ...(seoPopulate as object),
            },
            topBlocks: {
              on: {
                ...(headerPageBlocksPopulate.on as object),
                ...(editorialBlocksPopulate.on as object),
              },
            },
            bottomBlocks: {
              on: {
                ...(editorialBlocksPopulate.on as object),
              },
            },
          },
        });

      const city = await strapi
        .documents("api::city.city")
        .findFirst({
          locale,
          status,
          filters: {
            slug: { $eq: citySlug },
            locations: { id: { $notNull: true } },
          },
          fields: ["name", "slug", "federalState"],
          populate: {
            localizations: {
              fields: ["locale", "slug"],
            },
            locations: {
              ...(locationTeaserPopulate as any),
            },
          },
        });
      if (!city) {
        ctx.notFound("City not found");
        return;
      }

      const locationGroups = {
        open: [] as any[],
        openSoon: [] as any[],
        comingSoon: [] as any[],
      };

      if (city.locations && Array.isArray(city.locations)) {
        city.locations.forEach((location: any) => {
          const timezone = location.timezone || "Europe/Berlin";
          const openingStatus = getLocationStatus(
            location.newOpeningDate,
            timezone
          );
          location.openingStatus = openingStatus;

          if (openingStatus === "open" || openingStatus === "openNewToday") {
            locationGroups.open.push(location);
          } else if (openingStatus === "openSoon") {
            locationGroups.openSoon.push(location);
          } else {
            locationGroups.comingSoon.push(location);
          }
        });
      }

      return {
        data: {
          city,
          locations: locationGroups,
          cityPage: cityPage || null,
        },
      };
    },
  })
);
