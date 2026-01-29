/**
 * about-us-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import {
  customPageBlocksPopulate,
  editorialBlocksPopulate,
} from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::about-us-page.about-us-page",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };

      const page = await strapi
        .documents("api::about-us-page.about-us-page")
        .findFirst({
          locale,
          populate: {
            seo: {
              ...(seoPopulate as object),
            },
            blocks: {
              on: {
                ...customPageBlocksPopulate.on,
                ...editorialBlocksPopulate.on,
              },
            },
          } as any,
        });

      return { data: page || null };
    },
  }),
);
