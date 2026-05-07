/**
 * prices-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { seoPopulate } from "../../../utils/queries/components";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::prices-page.prices-page",
  ({ strapi }) => ({
    async findWithProductCategories(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      // Fetch prices-page (singleType)
      const pricesPage = await strapi
        .documents("api::prices-page.prices-page")
        .findFirst({
          locale,
          status,
          populate: {
            seo: seoPopulate as object,
            topBlocks: allBlocksPopulate as object,
            bottomBlocks: allBlocksPopulate as object,
          },
        });

      // Fetch product categories with treatments or products
      const productCategories = await strapi
        .documents("api::product-category.product-category")
        .findMany({
          locale,
          status,
          fields: ["name", "slug"],
          sort: { name: "asc" },
          filters: {
            $or: [
              { treatments: { $notNull: true } },
              { products: { $notNull: true } },
            ],
          } as any,
          populate: {
            treatments: {
              fields: ["name", "priceInEuroCent", "isStartingPrice"],
              populate: {
                treatmentPage: {
                  fields: ["name", "pathKey"],
                },
              },
            },
            products: {
              fields: ["name", "slug"],
              populate: {
                variants: {
                  filters: {
                    isActive: {
                      $eq: true,
                    },
                  },
                  fields: ["label", "slug", "isActive", "priceInEuroCent"],
                  populate: {
                    volume: {
                      fields: ["quantity", "unit"],
                    },
                  },
                },
                manufacturer: {
                  fields: ["name"],
                  populate: {
                    logo: mediaPopulate as object,
                  },
                },
              },
            },
          },
        });

      return {
        data: {
          pricesPage,
          productCategories: productCategories || [],
        },
      };
    },
  })
);
