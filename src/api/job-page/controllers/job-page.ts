/**
 * job-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { locationTeaserPopulate } from "../../../utils/queries/ui";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::job-page.job-page",
  ({ strapi }) => ({
    async findByJobSlug(ctx: Context) {
      const { jobSlug } = ctx.params as {
        jobSlug: string;
      };
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const jobPageRaw = await strapi
        .documents("api::job-page.job-page")
        .findFirst({
          locale,
          status,
          populate: {
            blocks: allBlocksPopulate as object,
          },
        });

      const jobPage = jobPageRaw ? { blocks: jobPageRaw.blocks } : null;

      const jobDetails = await strapi
        .documents("api::job.job")
        .findFirst({
          locale,
          status,
          filters: {
            slug: {
              $eq: jobSlug,
            },
            isActive: {
              $eq: true,
            },
          },
          populate: {
            localizations: {
              fields: ["locale", "slug"],
            },
            recruiter: {
              filters: {
                isActive: {
                  $eq: true,
                },
                hideFromPublic: {
                  $eq: false,
                },
              },
              fields: ["firstName", "lastName"],
              populate: {
                photo: mediaPopulate as object,
              },
            },
            cover: mediaPopulate as object,
            locations: {
              ...(locationTeaserPopulate as any),
            },
          },
        });

      if (!jobDetails) {
        ctx.notFound("Job not found");
        return;
      }

      return {
        data: {
          jobPage,
          jobDetails,
        },
      };
    },
  })
);
