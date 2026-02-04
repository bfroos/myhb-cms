/**
 * locations-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { getLocationStatus } from "../../../utils/locationStatus";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { locationTeaserPopulate } from "../../../utils/queries/ui";
import { seoPopulate } from "../../../utils/queries/components";
export default factories.createCoreController(
  "api::locations-page.locations-page",
  ({ strapi }) => ({
    async findWithLocations(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const locationsPage = await strapi
        .documents("api::locations-page.locations-page")
        .findFirst({
          locale,
          populate: {
            seo: seoPopulate as object,
            blocks: allBlocksPopulate as object,
          },
        });

      const locations = await strapi
        .documents("api::location.location")
        .findMany({
          locale,
          ...(locationTeaserPopulate as any),
        });

      const locationGroups = {
        open: [] as any[],
        openSoon: [] as any[],
        comingSoon: [] as any[],
      };

      // Add openingStatus to each location and group them
      locations.forEach((location: any) => {
        const timezone = location.timezone || "Europe/Berlin";
        const openingStatus = getLocationStatus(
          location.newOpeningDate,
          timezone
        );

        // Add openingStatus to location object
        location.openingStatus = openingStatus;

        // Group locations by status
        if (openingStatus === "open" || openingStatus === "openNewToday") {
          locationGroups.open.push(location);
        } else if (openingStatus === "openSoon") {
          locationGroups.openSoon.push(location);
        } else {
          locationGroups.comingSoon.push(location);
        }
      });

      return {
        data: {
          locations: locationGroups,
          locationsPage: locationsPage || null,
        },
      };
    },
  })
);
