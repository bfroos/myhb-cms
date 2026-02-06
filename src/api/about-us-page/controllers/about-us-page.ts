/**
 * about-us-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::about-us-page.about-us-page",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale, status } = ctx.query as {
        locale?: string;
        status?: "draft" | "published";
      };
      const docStatus = status || "published";

      const page = await strapi
        .documents("api::about-us-page.about-us-page")
        .findFirst({
          locale,
          status: docStatus,
          populate: {
            seo: seoPopulate as object,
            blocks: allBlocksPopulate as object,
          },
        });

      return { data: page || null };
    },
  })
);
