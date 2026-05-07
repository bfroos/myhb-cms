import type { Context } from "koa";
import { getPreviewStatus } from "../../../utils/previewStatus";

type PriceTeaserRow = {
  label: string;
  price: number;
  from?: boolean;
  href?: string;
};

function parseLimit(value: unknown): number {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 5;
  return Math.max(1, Math.min(20, Math.floor(limit)));
}

function priceFromCents(value: unknown): number | null {
  const cents = Number(value);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  return cents / 100;
}

function pushRow(rows: PriceTeaserRow[], row: PriceTeaserRow, limit: number) {
  if (rows.length >= limit) return;
  rows.push(row);
}

function productVariantHref(product: any, variant: any): string | undefined {
  const categorySlug = product?.category?.slug;
  const productSlug = product?.slug;
  const variantSlug = variant?.slug;
  if (!categorySlug || !productSlug) return undefined;

  const path = `/produkte/${categorySlug}/${productSlug}`;
  return variantSlug ? `${path}?v=${variantSlug}` : path;
}

async function findTreatmentRows(ctx: Context, limit: number, status: "draft" | "published") {
  const { locale, pathKey } = ctx.query as {
    locale?: string;
    pathKey?: string;
  };

  if (!pathKey) return [];

  const page = await strapi.documents("api::treatment-page.treatment-page").findFirst({
    locale,
    status,
    filters: {
      pathKey: { $eq: pathKey },
    },
    fields: ["pathKey"],
    populate: {
      treatment: {
        fields: ["name", "priceInEuroCent", "isStartingPrice"],
        populate: {
          products: {
            fields: ["name", "slug"],
            populate: {
              category: {
                fields: ["slug"],
              },
              variants: {
                fields: ["label", "slug", "isActive", "priceInEuroCent"],
              },
            },
          },
        },
      },
    },
  } as any);

  const rows: PriceTeaserRow[] = [];
  const treatment = (page as any)?.treatment;
  const treatmentPrice = priceFromCents(treatment?.priceInEuroCent);

  if (treatment?.name && treatmentPrice != null) {
    pushRow(
      rows,
      {
        label: treatment.name,
        price: treatmentPrice,
        from: Boolean(treatment.isStartingPrice),
        href: `/behandlungen/${pathKey}`,
      },
      limit
    );
  }

  for (const product of treatment?.products ?? []) {
    for (const variant of product?.variants ?? []) {
      if (variant?.isActive === false) continue;
      const price = priceFromCents(variant?.priceInEuroCent);
      if (price == null) continue;

      pushRow(
        rows,
        {
          label: variant?.label || product?.name,
          price,
          href: productVariantHref(product, variant),
        },
        limit
      );
    }
  }

  return rows;
}

async function findProductRows(ctx: Context, limit: number, status: "draft" | "published") {
  const { locale, productSlug } = ctx.query as {
    locale?: string;
    productSlug?: string;
  };

  if (!productSlug) return [];

  const product = await strapi.documents("api::product.product").findFirst({
    locale,
    status,
    filters: {
      slug: { $eq: productSlug },
    },
    fields: ["name", "slug"],
    populate: {
      category: {
        fields: ["slug"],
      },
      variants: {
        fields: ["label", "slug", "isActive", "priceInEuroCent"],
      },
    },
  } as any);

  const rows: PriceTeaserRow[] = [];

  for (const variant of (product as any)?.variants ?? []) {
    if (variant?.isActive === false) continue;
    const price = priceFromCents(variant?.priceInEuroCent);
    if (price == null) continue;

    pushRow(
      rows,
      {
        label: variant?.label || (product as any)?.name,
        price,
        href: productVariantHref(product, variant),
      },
      limit
    );
  }

  return rows;
}

export default {
  async findContext(ctx: Context) {
    const { type } = ctx.query as { type?: string };
    const limit = parseLimit(ctx.query.limit);
    const status = getPreviewStatus(ctx);

    const rows =
      type === "treatment-page"
        ? await findTreatmentRows(ctx, limit, status)
        : type === "product"
          ? await findProductRows(ctx, limit, status)
          : [];

    return { data: { items: rows } };
  },
};
