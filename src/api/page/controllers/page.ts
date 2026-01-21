/**
 * page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::page.page",
  ({ strapi }) => ({
    async findBySlug(ctx: Context) {
      const { slug } = ctx.params as { slug: string };
      const { locale } = ctx.query as { locale?: string };

      const page = await strapi.documents("api::page.page").findFirst({
        locale,
        filters: {
          slug: {
            $eq: slug,
          },
        },
        fields: ["name", "slug"],
        populate: {
          localizations: {
            fields: ["locale", "slug"],
          },
          seo: {
            ...(seoPopulate as object),
          },
          blocks: allBlocksPopulate as any,
        },
      });

      if (!page) {
        ctx.notFound("Page not found");
        return;
      }

      return { data: page };
    },
  })
);
