/**
 * menu controller
 */

import type { Context } from "koa";

const SEO_TREATMENT_PAGE_UID = "api::treatment-page.treatment-page";
const ADS_TREATMENT_PAGE_UID = "api::treatment-ads-page.treatment-ads-page";

export default {
  /**
   * Returns navigation menus for different content types.
   * Supports: treatment-pages, product-categories, price-categories
   */
  async getMenus(ctx: Context) {
    const { locale, types } = ctx.query as {
      locale?: string;
      types?: string | string[];
    };

    // Get all available locales
    const allLocales = await strapi
      .documents("plugin::i18n.locale")
      .findMany({});
    const locales = allLocales.map((l: any) => l.code);

    if (locales.length === 0) {
      locales.push("de"); // fallback
    }

    // Use provided locale or default to first available locale
    const requestedLocale = locale || locales[0] || "de";

    // Parse types - can be comma-separated string or array
    const requestedTypes = Array.isArray(types)
      ? types
      : typeof types === "string"
        ? types.split(",").map((t) => t.trim())
        : ["treatment-pages", "product-categories", "price-categories"]; // default to all

    const result: Record<string, any> = {};
    const siteMode = ctx.get("x-site-mode");
    const treatmentPageUid =
      siteMode === "ads" ? ADS_TREATMENT_PAGE_UID : SEO_TREATMENT_PAGE_UID;

    // Helper function to build tree structure for hierarchical data
    const buildTree = (
      items: any[],
      parentId: number | null = null,
      parentField: string = "parent"
    ): any[] => {
      return items
        .filter((item) => {
          const hasParent = !!item[parentField];
          return parentId === null
            ? !hasParent
            : hasParent && item[parentField]?.id === parentId;
        })
        .map((item) => {
          // Explicitly construct result item with only the fields we need
          const resultItem: {
            id: number;
            name: string;
            slug: string;
            pathKey?: string;
            children: any[];
          } = {
            id: item.id,
            name: item.name || "",
            slug: item.slug || "",
            children: buildTree(items, item.id, parentField),
          };

          // Add pathKey if it exists (for treatment pages)
          if (item.pathKey) {
            resultItem.pathKey = item.pathKey;
          }

          return resultItem;
        });
    };

    // Treatment Pages Menu
    if (requestedTypes.includes("treatment-pages")) {
      const allPages = await strapi.documents(treatmentPageUid).findMany({
        locale: requestedLocale,
        status: "published",
        fields: ["id", "name", "slug"],
        filters: {
          showInMenu: { $eq: true },
        },
        populate: {
          parent: {
            fields: ["id"],
          },
        },
        limit: 9999,
      });

      result["treatment-pages"] = buildTree(allPages, null, "parent");
    }

    // Product Categories Menu
    if (requestedTypes.includes("product-categories")) {
      const allCategories = await strapi
        .documents("api::product-category.product-category")
        .findMany({
          locale: requestedLocale,
          status: "published",
          fields: ["id", "name", "slug"],
          limit: 9999,
        });

      // Product categories are flat (no parent/child), so return as simple array
      result["product-categories"] = allCategories.map((category: any) => ({
        id: category.id,
        name: category.name || "",
        slug: category.slug || "",
      }));
    }

    return {
      data: result,
    };
  },
};
