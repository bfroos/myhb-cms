/**
 * blog-article controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::blog-article.blog-article",
  ({ strapi }) => ({
    async findBySlug(ctx: Context) {
      const { slug } = ctx.params as { slug: string };
      const { locale } = ctx.query as { locale?: string };

      const article = await strapi
        .documents("api::blog-article.blog-article")
        .findFirst({
          locale,
          filters: {
            slug: {
              $eq: slug,
            },
          },
          fields: ["headline", "intro", "displayDate", "footnotes"],
          populate: {
            localizations: {
              fields: ["locale", "slug"],
            },
            cover: mediaPopulate as object,
            components: {
              on: {
                "blog.text": {
                  populate: "*",
                },
                "blog.image": {
                  populate: {
                    image: mediaPopulate as object,
                  },
                },
                "blog.newsletter": {
                  populate: "*",
                },
                "blog.cta": {
                  populate: "*",
                },
              },
            },
            seo: {
              ...(seoPopulate as object),
            },
          },
        });

      if (!article) {
        ctx.notFound("Article not found");
        return;
      }

      return { data: article };
    },
  })
);
