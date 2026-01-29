/**
 * Lifecycle hooks for treatment-page content type
 * Handles ancestorSlugs calculation, cycle prevention, and descendant updates
 */

import type { Core } from "@strapi/strapi";

// ID type in Strapi 5 can be string or number
type ID = string | number;

interface TreatmentPageData {
  id?: ID;
  slug?: string;
  parent?: ID | { id: ID } | null;
  ancestorSlugs?: string[];
  pathKey?: string;
}

interface LifecycleEvent {
  params: {
    data: TreatmentPageData;
    where?: { id?: ID };
  };
  result?: any; // In afterUpdate, this contains the updated entity
  model?: {
    uid: string;
  };
}

// Track updates to prevent infinite loops
const updatingDescendants = new Set<ID>();

// Store old values before update to compare in afterUpdate
const oldValues = new Map<ID, { slug: string; ancestorSlugs: string[] }>();

/**
 * Resolve locale from lifecycle event (Strapi Admin does not always set `event.params.locale`)
 */
function resolveEventLocale(event: any, fallback = "de"): string {
  return (
    event?.params?.data?.locale ||
    event?.params?.locale ||
    event?.params?.where?.locale ||
    fallback
  );
}

/**
 * Safely converts JSONValue to string array
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

/**
 * Calculates ancestorSlugs based on parent for a specific locale
 */
async function calculateAncestorSlugs(
  strapi: Core.Strapi,
  parentId: ID | null | undefined,
  locale?: string
): Promise<string[]> {
  if (!parentId) {
    return [];
  }

  // In Strapi 5 + i18n it's possible that the relation points to a parent entry
  // of a different locale (same documentId). For ancestor/pathKey we need the
  // parent entry in the CURRENT locale.
  const parentBase = await strapi.entityService.findOne(
    "api::treatment-page.treatment-page",
    parentId,
    {
      fields: ["slug", "ancestorSlugs", "documentId"] as any,
      populate: {},
    } as any
  );

  let parent: any = parentBase;
  const parentDocumentId =
    typeof (parentBase as any)?.documentId === "string"
      ? ((parentBase as any).documentId as string)
      : null;

  if (locale && parentDocumentId) {
    try {
      const docs = (strapi as any).documents(
        "api::treatment-page.treatment-page"
      );
      // Prefer draft version as source-of-truth for building URLs in admin/editor.
      parent = await docs.findOne({
        documentId: parentDocumentId,
        locale,
        status: "draft",
        fields: ["slug", "ancestorSlugs"] as any,
      });
    } catch {
      // If localization doesn't exist, fall back to base entry.
      parent = parentBase;
    }
  }

  if (!parent) {
    return [];
  }

  const parentAncestors = toStringArray((parent as any).ancestorSlugs);
  const parentSlug =
    typeof (parent as any).slug === "string" ? (parent as any).slug : null;

  if (!parentSlug) {
    return parentAncestors;
  }

  return [...parentAncestors, parentSlug];
}

/**
 * Calculates pathKey from ancestorSlugs and slug
 * pathKey = [...ancestorSlugs, slug].join('/')
 */
function calculatePathKey(ancestorSlugs: string[], slug: string): string {
  const segments = [...ancestorSlugs, slug].filter(Boolean);
  return segments.join("/");
}

/**
 * Strapi 5 helper: resolve `documentId` for an entry id (typing may not expose it)
 */
async function resolveDocumentId(
  strapi: Core.Strapi,
  entryId: ID,
  locale: string
): Promise<string | null> {
  const refreshed = await strapi.entityService.findOne(
    "api::treatment-page.treatment-page",
    entryId,
    { fields: ["documentId"] as any, locale } as any
  );

  return typeof (refreshed as any)?.documentId === "string"
    ? ((refreshed as any).documentId as string)
    : null;
}

/**
 * Strapi 5 helper: check if a published version exists for locale.
 * We intentionally swallow errors (e.g. "not found" when not published).
 */
async function hasPublishedVersion(
  strapi: Core.Strapi,
  documentId: string,
  locale: string
): Promise<boolean> {
  const docs = (strapi as any).documents("api::treatment-page.treatment-page");
  try {
    await docs.findOne({
      documentId,
      locale,
      status: "published",
      fields: ["documentId"] as any,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Strapi 5 helper: update draft and (optionally) keep published state in sync.
 *
 * If `republish === true`, we publish the updated draft and discard the draft diff
 * to avoid leaving the entry in "Modified" status in the admin UI.
 */
async function updateDraftAndMaybeRepublish(
  strapi: Core.Strapi,
  documentId: string,
  locale: string,
  data: Record<string, any>,
  republish: boolean
): Promise<void> {
  const docs = (strapi as any).documents("api::treatment-page.treatment-page");

  await docs.update({
    documentId,
    locale,
    data,
    status: "draft",
  });

  if (!republish) return;

  await docs.publish({ documentId, locale });
  await docs.discardDraft({ documentId, locale });
}

/**
 * Validates that slug is unique within the same parent level for a specific locale
 * Returns true if duplicate found
 */
async function slugExistsInParentLevel(
  strapi: Core.Strapi,
  slug: string,
  parentId: ID | null | undefined,
  excludePageId?: ID,
  excludeDocumentId?: string,
  locale?: string
): Promise<boolean> {
  const filterConditions: any[] = [
    {
      slug: {
        $eq: slug,
      },
    },
  ];

  // Filter by parent (null for root level, or specific parent ID)
  if (parentId === null || parentId === undefined) {
    // In Strapi 5, filter for null relations
    filterConditions.push({
      parent: null,
    });
  } else {
    filterConditions.push({
      parent: {
        id: {
          $eq: parentId,
        },
      },
    });
  }

  // Exclude current page if updating
  if (excludePageId) {
    filterConditions.push({
      id: {
        $ne: excludePageId,
      },
    });
  }

  const filters: any =
    filterConditions.length === 1
      ? filterConditions[0]
      : {
          $and: filterConditions,
        };

  const existing = await strapi.entityService.findMany(
    "api::treatment-page.treatment-page",
    {
      filters,
      populate: {},
      locale,
    }
  );

  // Filter out current document by documentId if provided
  let filteredExisting = existing;
  if (excludeDocumentId) {
    filteredExisting = existing.filter((p: any) => {
      const docId = (p as any).documentId;
      return docId !== excludeDocumentId;
    });
  }

  return filteredExisting.length > 0;
}

/**
 * Checks if setting parentId would create a cycle
 * Returns true if cycle would be created
 */
async function wouldCreateCycle(
  strapi: Core.Strapi,
  pageId: ID,
  newParentId: ID | null | undefined
): Promise<boolean> {
  if (!newParentId) {
    return false;
  }

  // If trying to set self as parent, that's a cycle
  if (pageId === newParentId) {
    return true;
  }

  // Get all ancestors of the new parent by traversing up the tree
  let currentId: ID | null = newParentId;
  const visited = new Set<ID>();

  while (currentId) {
    // If we encounter the page we're trying to update, it's a cycle
    if (currentId === pageId) {
      return true;
    }

    // Prevent infinite loops
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const current = await strapi.entityService.findOne(
      "api::treatment-page.treatment-page",
      currentId,
      {
        populate: {
          parent: {
            fields: ["id"],
          },
        },
      }
    );

    if (!current || !(current as any).parent) {
      break;
    }

    const parent = (current as any).parent;
    currentId =
      typeof parent === "object" && parent !== null ? parent.id : parent;
  }

  return false;
}

/**
 * Updates all descendants of a page for a specific locale
 */
async function updateDescendants(
  strapi: Core.Strapi,
  pageId: ID,
  pageSlug: string,
  pageAncestorSlugs: string[],
  locale: string
): Promise<void> {
  // Prevent infinite loops
  if (updatingDescendants.has(pageId)) {
    return;
  }

  updatingDescendants.add(pageId);

  try {
    // Find all direct children for this locale
    const children = await strapi.entityService.findMany(
      "api::treatment-page.treatment-page",
      {
        filters: {
          parent: {
            id: pageId,
          },
        },
        // `documentId` exists in Strapi 5 but may not be in generated typings.
        // Keep it in the payload for re-publishing.
        fields: ["slug", "documentId", "publishedAt"] as any,
        populate: {},
        locale,
      } as any
    );

    // Update each child for this locale
    for (const child of children) {
      const newAncestorSlugs = [...pageAncestorSlugs, pageSlug];
      const childSlug =
        typeof (child as any).slug === "string" ? (child as any).slug : null;
      const childDocumentId =
        typeof (child as any).documentId === "string"
          ? ((child as any).documentId as string)
          : null;
      // IMPORTANT (Strapi 5): entityService typically returns the DRAFT version.
      // For published documents, the draft often has `publishedAt = null`, even if a published
      // version exists. So we must detect "was published" via Document Service.
      let wasPublished = Boolean((child as any).publishedAt);

      if (!childSlug) {
        continue;
      }

      const newPathKey = calculatePathKey(newAncestorSlugs, childSlug);

      // Prevent child update from triggering lifecycles again.
      // We'll handle recursion ourselves below.
      updatingDescendants.add(child.id);
      try {
        const dataToUpdate = {
          ancestorSlugs: newAncestorSlugs,
          pathKey: newPathKey,
        };

        // Resolve documentId reliably (typing may not expose it)
        let documentId = childDocumentId;
        if (!documentId) {
          documentId = await resolveDocumentId(strapi, child.id, locale);
        }

        if (documentId) {
          // Detect whether a published version exists for this locale
          if (!wasPublished) {
            wasPublished = await hasPublishedVersion(
              strapi,
              documentId,
              locale
            );
          }

          await updateDraftAndMaybeRepublish(
            strapi,
            documentId,
            locale,
            dataToUpdate,
            wasPublished
          );
        } else {
          // Fallback: update draft if we can't get a documentId
          await strapi.entityService.update(
            "api::treatment-page.treatment-page",
            child.id,
            { data: dataToUpdate, locale }
          );
        }
      } finally {
        updatingDescendants.delete(child.id);
      }

      // Recursively update descendants for this locale
      await updateDescendants(
        strapi,
        child.id,
        childSlug,
        newAncestorSlugs,
        locale
      );
    }
  } finally {
    updatingDescendants.delete(pageId);
  }
}

/**
 * Extracts parent ID from Strapi 5 relation syntax
 * Handles: { connect: [id] }, { set: [id] }, { disconnect: [id] }, { id }, or direct id
 */
function extractParentId(parent: any): ID | null {
  if (!parent) {
    return null;
  }

  // Direct ID
  if (typeof parent === "string" || typeof parent === "number") {
    return parent;
  }

  // Object with id property
  if (parent.id && !parent.connect && !parent.set && !parent.disconnect) {
    return typeof parent.id === "object" && parent.id !== null
      ? parent.id.id
      : parent.id;
  }

  // Strapi 5 relation syntax: { set: [id] } - takes precedence (replaces all)
  if (parent.set && Array.isArray(parent.set) && parent.set.length > 0) {
    const first = parent.set[0];
    if (typeof first === "object" && first !== null) {
      return first.id || first.documentId || first;
    }
    return first;
  }

  // Strapi 5 relation syntax: { connect: [id] } - adds relation
  if (
    parent.connect &&
    Array.isArray(parent.connect) &&
    parent.connect.length > 0
  ) {
    const first = parent.connect[0];
    if (typeof first === "object" && first !== null) {
      return first.id || first.documentId || first;
    }
    return first;
  }

  // If only disconnect, return null (relation is being removed)
  if (
    parent.disconnect &&
    (!parent.connect || parent.connect.length === 0) &&
    (!parent.set || parent.set.length === 0)
  ) {
    return null;
  }

  return null;
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    // In Strapi 5, strapi is available via require or global
    const strapi =
      (global as any).strapi ||
      require("@strapi/strapi").default ||
      require("@strapi/strapi");

    // Extract locale (admin doesn't always set `event.params.locale`)
    const locale = resolveEventLocale(event, "de");

    if (!data.slug) {
      throw new Error("Slug is required");
    }

    // Extract parent ID from Strapi 5 relation syntax
    const parentId = extractParentId(data.parent);

    // In Strapi 5, when publishing a draft, beforeCreate might be called again
    // Check if this is the same document by documentId
    const currentDocumentId = data.documentId;

    // Validate slug uniqueness within parent level for this locale
    // Pass documentId to exclude current document if it exists
    const slugExists = await slugExistsInParentLevel(
      strapi,
      data.slug,
      parentId,
      undefined, // No ID yet in beforeCreate
      currentDocumentId, // But we can use documentId to exclude
      locale
    );
    if (slugExists) {
      throw new Error(
        "Der Slug muss innerhalb derselben Ebene eindeutig sein."
      );
    }

    // Calculate ancestorSlugs for this locale
    if (parentId) {
      data.ancestorSlugs = await calculateAncestorSlugs(
        strapi,
        parentId,
        locale
      );
    } else {
      data.ancestorSlugs = [];
    }

    // Calculate pathKey for this locale
    data.pathKey = calculatePathKey(data.ancestorSlugs, data.slug);
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    const strapi =
      (global as any).strapi ||
      require("@strapi/strapi").default ||
      require("@strapi/strapi");

    // Extract locale (admin doesn't always set `event.params.locale`)
    const locale = resolveEventLocale(event, "de");

    if (!where?.id) {
      return;
    }

    const pageId = where.id;

    // Skip if we're updating descendants (to prevent loops)
    if (updatingDescendants.has(pageId)) {
      return;
    }

    // Get current page data to compare changes for this locale
    const current = await strapi.entityService.findOne(
      "api::treatment-page.treatment-page",
      pageId,
      {
        populate: {
          parent: {
            fields: ["id"],
          },
        },
        locale,
      }
    );

    if (!current) {
      return;
    }

    // Store old values for comparison in afterUpdate
    const currentSlug =
      typeof (current as any).slug === "string" ? (current as any).slug : "";
    const currentAncestorSlugs = toStringArray((current as any).ancestorSlugs);
    oldValues.set(pageId, {
      slug: currentSlug,
      ancestorSlugs: currentAncestorSlugs,
    });

    const currentParent = (current as any).parent;
    const currentParentId =
      currentParent &&
      typeof currentParent === "object" &&
      currentParent !== null
        ? currentParent.id
        : (currentParent as ID | null);

    // Check if slug is being changed
    const slugChanged = "slug" in data && data.slug !== currentSlug;
    const newSlug = slugChanged ? data.slug : currentSlug;

    // Check if parent is being changed
    let newParentId: ID | null | undefined = currentParentId;
    let parentChanged = false;

    if ("parent" in data) {
      // Extract parent ID from Strapi 5 relation syntax
      const extractedParentId = extractParentId(data.parent);

      // If parent is explicitly being set to null (disconnect only)
      const isDisconnecting =
        data.parent?.disconnect &&
        Array.isArray(data.parent.disconnect) &&
        data.parent.disconnect.length > 0 &&
        (!data.parent.connect || data.parent.connect.length === 0) &&
        (!data.parent.set || data.parent.set.length === 0);

      // If parent is not being changed (all arrays empty), keep current parent
      if (extractedParentId === null && !isDisconnecting) {
        // Parent not changed, use current
        newParentId = currentParentId;
      } else {
        // Parent is being changed
        parentChanged = true;
        newParentId = extractedParentId;

        // Cycle prevention
        if (
          newParentId &&
          (await wouldCreateCycle(strapi, pageId, newParentId))
        ) {
          throw new Error(
            `Cannot set parent: This would create a circular reference. A page cannot be its own ancestor.`
          );
        }
      }
    }

    // Validate slug uniqueness if slug or parent changed (for this locale)
    if (slugChanged || parentChanged) {
      if (
        await slugExistsInParentLevel(
          strapi,
          newSlug,
          newParentId,
          pageId,
          undefined,
          locale
        )
      ) {
        throw new Error(
          "Der Slug muss innerhalb derselben Ebene eindeutig sein."
        );
      }
    }

    // Calculate ancestorSlugs for this locale
    if (parentChanged || slugChanged) {
      data.ancestorSlugs = await calculateAncestorSlugs(
        strapi,
        newParentId,
        locale
      );
    } else if ("parent" in data) {
      // Parent field present but not changed, recalculate from current
      data.ancestorSlugs = await calculateAncestorSlugs(
        strapi,
        currentParentId,
        locale
      );
    }

    // Calculate pathKey if ancestorSlugs or slug changed
    if (data.ancestorSlugs !== undefined || slugChanged) {
      const finalAncestorSlugs =
        data.ancestorSlugs !== undefined
          ? data.ancestorSlugs
          : toStringArray((current as any).ancestorSlugs);
      const finalSlug = newSlug || currentSlug;
      data.pathKey = calculatePathKey(finalAncestorSlugs, finalSlug);
    }
  },

  async afterUpdate(event: any) {
    const { data, where } = event.params;
    const { result } = event;
    const strapi =
      (global as any).strapi ||
      require("@strapi/strapi").default ||
      require("@strapi/strapi");

    // Extract locale (admin doesn't always set `event.params.locale`)
    const locale = resolveEventLocale(event, "de");

    // Skip if we're updating descendants (to prevent loops)
    if (!where?.id || updatingDescendants.has(where.id)) {
      return;
    }

    const pageId = where.id;

    // Get old values that were stored in beforeUpdate
    const oldValue = oldValues.get(pageId);
    oldValues.delete(pageId); // Clean up

    // Get new values after update for this locale
    let updated: any;
    if (result) {
      updated = result;
    } else {
      updated = await strapi.entityService.findOne(
        "api::treatment-page.treatment-page",
        pageId,
        {
          populate: {},
          locale,
        }
      );
    }

    if (!updated) {
      return;
    }

    const newSlug =
      typeof (updated as any).slug === "string" ? (updated as any).slug : null;
    const newAncestorSlugs = toStringArray((updated as any).ancestorSlugs);

    if (!newSlug) {
      return;
    }

    // Check if slug or ancestorSlugs actually changed (compare with old values)
    if (oldValue) {
      const slugChanged = oldValue.slug !== newSlug;
      const ancestorSlugsChanged =
        JSON.stringify(oldValue.ancestorSlugs) !==
        JSON.stringify(newAncestorSlugs);

      // Only update descendants if values actually changed (for this locale)
      if (slugChanged || ancestorSlugsChanged) {
        // Update all descendants for this locale
        await updateDescendants(
          strapi,
          pageId,
          newSlug,
          newAncestorSlugs,
          locale
        );
      }
    } else {
      // If old values not available, check if slug or parent was in data
      const slugChanged = "slug" in data;
      const parentChanged = "parent" in data;

      if (slugChanged || parentChanged) {
        // Update all descendants for this locale
        await updateDescendants(
          strapi,
          pageId,
          newSlug,
          newAncestorSlugs,
          locale
        );
      }
    }
  },
};
