/**
 * career-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { locationTeaserPopulate } from "../../../utils/queries/ui";
import { seoPopulate } from "../../../utils/queries/components";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::career-page.career-page",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      // Fetch career-page (singleType)
      const careerPage = await strapi
        .documents("api::career-page.career-page")
        .findFirst({
          locale,
          status,
          populate: {
            topBlocks: allBlocksPopulate as object,
            bottomBlocks: allBlocksPopulate as object,
            seo: seoPopulate as object,
            jobTeasers: {
              populate: {
                cardSettings: {
                  populate: "*",
                },
              },
            },
          },
        });

      // Fetch all active jobs
      const jobs = await strapi.documents("api::job.job").findMany({
        locale,
        status,
        filters: {
          isActive: {
            $eq: true,
          },
        },
        fields: [
          "title",
          "slug",
          "genderHint",
          "employmentTypes",
          "hourlyRateMinInEuroCent",
          "hourlyRateMaxInEuroCent",
        ],
        populate: {
          localizations: {
            fields: ["locale", "slug"],
          },
          cover: mediaPopulate as object,
          locations: {
            fields: ["name"],
            filters: {
              city: {
                id: { $notNull: true },
              },
            },
            populate: {
              city: {
                fields: ["name"],
              },
            },
          },
        },
      });

      return {
        data: {
          careerPage,
          jobs,
        },
      };
    },
  })
);
