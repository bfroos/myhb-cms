/**
 * about-us-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::about-us-page.about-us-page",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const page = await strapi
        .documents("api::about-us-page.about-us-page")
        .findFirst({
          locale,
          status,
          populate: {
            seo: seoPopulate as object,
            blocks: allBlocksPopulate as object,
          },
        });

      return { data: page || null };
    },
  })
);
