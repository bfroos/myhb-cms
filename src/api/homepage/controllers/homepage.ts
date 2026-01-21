/**
 * homepage controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { homepageBlocksPopulate } from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::homepage.homepage",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };

      const page = await strapi.documents("api::homepage.homepage").findFirst({
        locale,
        populate: {
          seo: {
            ...(seoPopulate as object),
          },
          blocks: homepageBlocksPopulate as any,
        },
      });

      return { data: page || null };
    },
  })
);
