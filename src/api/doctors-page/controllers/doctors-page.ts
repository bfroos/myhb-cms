/**
 * doctors-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::doctors-page.doctors-page",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };

      const page = await strapi
        .documents("api::doctors-page.doctors-page")
        .findFirst({
          locale,
          status: "published",
          populate: {
            seo: seoPopulate as object,
            blocks: allBlocksPopulate as object,
          },
        });

      return { data: page || null };
    },
  })
);
