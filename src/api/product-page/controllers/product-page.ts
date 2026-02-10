/**
 * product-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { treatmentTeaserPopulate } from "../../../utils/queries/ui";
import { allBlocksPopulate } from "../../../utils/queries/blocks";
import { mediaPopulate } from "../../../utils/queries/strapi";

export default factories.createCoreController(
  "api::product-page.product-page",
  ({ strapi }) => ({
    /**
     * Find a product by categorySlug and productSlug with product-page blocks
     */
    async findByProductSlug(ctx: Context) {
      const { productSlug } = ctx.params as {
        productSlug: string;
      };
      const { locale } = ctx.query as { locale?: string };

      // Fetch product-page (singleType) - only blocks
      const productPageRaw = await strapi
        .documents("api::product-page.product-page")
        .findFirst({
          locale,
          status: "published",
          populate: {
            blocks: allBlocksPopulate as object,
          },
        });

      const productPage = productPageRaw
        ? { blocks: (productPageRaw as any).blocks }
        : null;

      // Fetch product with all fields except treatments
      const product = await strapi
        .documents("api::product.product")
        .findFirst({
          locale,
          status: "published",
          filters: {
            slug: {
              $eq: productSlug,
            },
          },
          populate: {
            localizations: {
              fields: ["locale", "slug"],
            },
            manufacturer: {
              fields: ["name"],
            },
            category: {
              fields: ["name", "slug"],
              populate: {
                localizations: {
                  fields: ["locale", "slug"],
                },
              },
            },
            variants: {
              fields: [
                "label",
                "slug",
                "isActive",
                "priceInEuroCent",
                "description",
              ],
              populate: {
                volume: {
                  fields: ["quantity", "unit"],
                },
              },
            },
            treatments: {
              filters: {
                treatmentPage: {
                  id: { $notNull: true },
                },
              },
              fields: ["name"],
              populate: {
                treatmentPage: treatmentTeaserPopulate as object,
              },
            },
            images: mediaPopulate as object,
          },
        });

      if (!product) {
        ctx.notFound("Product not found");
        return;
      }

      // Defensive: product.variants may not exist (typing issue)
      let cheapestVariant = null;
      if (
        Array.isArray((product as any).variants) &&
        (product as any).variants.length > 0
      ) {
        cheapestVariant = (product as any).variants.reduce(
          (min: any, variant: any) =>
            variant.priceInEuroCent < min.priceInEuroCent ? variant : min,
          (product as any).variants[0]
        );
      }

      return {
        data: {
          productPage,
          product,
          cheapestVariantPrice: cheapestVariant?.priceInEuroCent ?? 0,
        },
      };
    },
  })
);
