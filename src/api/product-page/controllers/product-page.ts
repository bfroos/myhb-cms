/**
 * product-page controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { treatmentTeaserPopulate } from "../../../utils/queries/ui";
import { allBlocksPopulate } from "../../../utils/queries/blocks";

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
          populate: {
            blocks: allBlocksPopulate,
          } as any,
        });

      const productPage = productPageRaw
        ? { blocks: (productPageRaw as any).blocks }
        : null;

      // Fetch product with all fields except treatments
      const product = await strapi.documents("api::product.product").findFirst({
        locale,
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
              images: {
                fields: ["url", "formats"],
              },
            },
          },
        },
      });

      if (!product) {
        ctx.notFound("Product not found");
        return;
      }

      // Fetch treatments separately with treatmentTeaserPopulate
      const productWithTreatments = (await strapi
        .documents("api::product.product")
        .findFirst({
          locale,
          filters: {
            id: {
              $eq: product.id,
            },
          },
          populate: {
            treatments: {
              fields: ["name"],
              populate: {
                treatmentPage: treatmentTeaserPopulate as object,
              },
            },
          },
        })) as any;
      const relatedTreatments = productWithTreatments?.treatments ?? [];

      const relatedTreatmentsWithBlocks = relatedTreatments.map(
        (treatment: any) => {
          return {
            ...treatment.treatmentPage,
          };
        }
      );

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
          relatedTreatmentTeasers: relatedTreatmentsWithBlocks,
          cheapestVariantPrice: cheapestVariant?.priceInEuroCent ?? 0,
        },
      };
    },
  })
);
