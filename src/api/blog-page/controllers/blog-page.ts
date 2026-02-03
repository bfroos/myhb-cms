import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::blog-page.blog-page",
  ({ strapi }) => ({
    async find(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const categorySlug = ctx.query.categorySlug as string | undefined;
      const page = Math.max(1, Number(ctx.query.page) || 1);
      const pageSize = 9;

      // Fetch blog-page (singleType)
      const blogPage = await strapi
        .documents("api::blog-page.blog-page")
        .findFirst({
          locale,
          populate: {
            seo: seoPopulate,
            blocks: allBlocksPopulate,
          },
        });

      // Fetch all categories for navigation
      const categories = await strapi
        .documents("api::blog-category.blog-category")
        .findMany({
          locale,
          fields: ["name", "slug"],
        });

      // Build filters for articles
      const articleFilters: any = {};
      if (categorySlug) {
        // Find category by slug first
        const category = categories.find(
          (cat: any) => cat.slug === categorySlug
        );
        if (category) {
          articleFilters.category = {
            documentId: category.documentId,
          };
        }
      }

      // Fetch paginated articles and total count in parallel
      const [articles, total] = await Promise.all([
        strapi.documents("api::blog-article.blog-article").findMany({
          locale,
          fields: ["headline", "intro", "displayDate", "slug"],
          filters:
            Object.keys(articleFilters).length > 0 ? articleFilters : undefined,
          populate: {
            localizations: {
              fields: ["locale", "slug"],
            },
            category: {
              fields: ["name", "slug"],
            },
            cover: mediaPopulate as object,
          },
          sort: { displayDate: "desc" },
          limit: pageSize,
          start: (page - 1) * pageSize,
        }),
        strapi.documents("api::blog-article.blog-article").count({
          locale,
          filters:
            Object.keys(articleFilters).length > 0 ? articleFilters : undefined,
        }),
      ]);

      const pageCount = Math.ceil(total / pageSize);

      return {
        data: {
          blogPage,
          articles,
          categories,
          pagination: {
            page,
            pageSize,
            pageCount,
            total,
          },
        },
      };
    },
  })
);
