import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { seoPopulate } from "../../../utils/queries/components";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::landing-page.landing-page" as any,
  ({ strapi }) => ({
    async findBySlug(ctx: Context) {
      const { slug } = ctx.params as { slug: string };
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const page = await strapi
        .documents("api::landing-page.landing-page" as any)
        .findFirst({
          locale,
          status,
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
            seo: seoPopulate as object,
            blocks: allBlocksPopulate as object,
          },
        });

      if (!page) {
        ctx.notFound("Landing page not found");
        return;
      }

      return { data: page };
    },
  }),
);
