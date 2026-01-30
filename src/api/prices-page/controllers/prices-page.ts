/**
 * prices-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import {
  editorialBlocksPopulate,
  headerPageBlocksPopulate,
} from "../../../utils/queries/blocks";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { seoPopulate } from "../../../utils/queries/components";

export default factories.createCoreController(
  "api::prices-page.prices-page",
  ({ strapi }) => ({
    async findWithProductCategories(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };

      // Fetch prices-page (singleType)
      const pricesPage = await strapi
        .documents("api::prices-page.prices-page")
        .findFirst({
          locale,
          populate: {
            seo: {
              ...(seoPopulate as object),
            },
            topBlocks: {
              on: {
                ...(headerPageBlocksPopulate.on as object),
                ...(editorialBlocksPopulate.on as object),
              },
            },
            bottomBlocks: {
              on: {
                ...(editorialBlocksPopulate.on as object),
              },
            },
          },
        });

      // Fetch product categories with treatments or products
      const productCategories = await strapi
        .documents("api::product-category.product-category")
        .findMany({
          locale,
          fields: ["name", "slug"],
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
