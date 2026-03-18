/**
 * Lifecycle hooks for treatment-ads-page content type
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

/**
 * Runs a function asynchronously after the HTTP response is sent.
 * Prevents long-running descendant updates from causing timeouts and
 * "Unexpected token <, "<!DOCTYPE "..." (HTML error page instead of JSON).
 */
function runAfterResponse(fn: () => Promise<void>, strapi: Core.Strapi): void {
  setImmediate(() => {
    fn().catch((err) => {
      strapi.log.error(
        "[treatment-ads-page] Background descendant update failed:",
        err
      );
    });
  });
}

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
    "api::treatment-ads-page.treatment-ads-page",
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
        "api::treatment-ads-page.treatment-ads-page"
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
 * Strapi 5 helper: resolve entity id from documentId + locale.
 * Needed when Document Service passes where.documentId instead of where.id.
 */
async function resolveEntityIdFromDocumentId(
  strapi: Core.Strapi,
  documentId: string,
  locale: string
): Promise<ID | null> {
  try {
    const docs = (strapi as any).documents(
      "api::treatment-ads-page.treatment-ads-page"
    );
    const entry = await docs.findOne({
      documentId,
      locale,
      status: "draft",
      fields: ["id"] as any,
    });
    return (entry as any)?.id ?? null;
  } catch {
    return null;
  }
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
    "api::treatment-ads-page.treatment-ads-page",
    entryId,
    { fields: ["documentId"] as any, locale } as any
  );

  return typeof (refreshed as any)?.documentId === "string"
    ? ((refreshed as any).documentId as string)
    : null;
}

/**
 * Strapi 5 helper: check whether a published row exists for locale.
 * Uses a DB query to avoid false negatives from document service errors.
 */
async function hasPublishedVersion(
  strapi: Core.Strapi,
  documentId: string,
  locale: string
): Promise<boolean> {
  try {
    const publishedEntry = await strapi.db
      .query("api::treatment-ads-page.treatment-ads-page")
      .findOne({
        where: {
          documentId,
          locale,
          publishedAt: { $notNull: true },
        },
        select: ["id"],
      } as any);
    return Boolean(publishedEntry);
  } catch {
    return false;
  }
}

/**
 * Strapi 5 helper: update draft and keep published state in sync when needed.
 *
 * For published entries, update draft + published in parallel and then discard draft
 * so the admin UI does not keep entries in "Modified" state.
 */
async function updateDraftAndMaybeRepublish(
  strapi: Core.Strapi,
  documentId: string,
  locale: string,
  data: Record<string, any>,
  republish: boolean
): Promise<void> {
  const docs = (strapi as any).documents("api::treatment-ads-page.treatment-ads-page");

  if (!republish) {
    await docs.update({
      documentId,
      locale,
      data,
      status: "draft",
    });
    return;
  }

  await Promise.all([
    docs.update({ documentId, locale, data, status: "draft" }),
    docs.update({ documentId, locale, data, status: "published" }),
  ]);

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
    "api::treatment-ads-page.treatment-ads-page",
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
      "api::treatment-ads-page.treatment-ads-page",
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
      "api::treatment-ads-page.treatment-ads-page",
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

    // Update each child in parallel (siblings are independent)
    const newAncestorSlugs = [...pageAncestorSlugs, pageSlug];
    await Promise.all(
      children.map(async (child) => {
        const childSlug =
          typeof (child as any).slug === "string" ? (child as any).slug : null;
        const childDocumentId =
          typeof (child as any).documentId === "string"
            ? ((child as any).documentId as string)
            : null;
        let wasPublished = Boolean((child as any).publishedAt);

        if (!childSlug) return;

        const newPathKey = calculatePathKey(newAncestorSlugs, childSlug);

        updatingDescendants.add(child.id);
        try {
          const dataToUpdate = {
            ancestorSlugs: newAncestorSlugs,
            pathKey: newPathKey,
          };

          let documentId = childDocumentId;
          if (!documentId) {
            documentId = await resolveDocumentId(strapi, child.id, locale);
          }

          if (documentId) {
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
            await strapi.entityService.update(
              "api::treatment-ads-page.treatment-ads-page",
              child.id,
              { data: dataToUpdate, locale }
            );
          }

          await updateDescendants(
            strapi,
            child.id,
            childSlug,
            newAncestorSlugs,
            locale
          );
        } finally {
          updatingDescendants.delete(child.id);
        }
      })
    );
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

  // When parent relation is removed in admin (e.g. child removed from parent's children list),
  // Strapi sends internally: parent: { disconnect: [...] }
  if (
    parent.disconnect &&
    (!parent.connect || parent.connect.length === 0) &&
    (!parent.set || parent.set.length === 0)
  ) {
    return null;
  }

  return null;
}

/**
 * Extracts IDs from children.disconnect (when parent A removes child B)
 */
function extractDisconnectedChildIds(children: any): ID[] {
  if (!children?.disconnect || !Array.isArray(children.disconnect)) {
    return [];
  }
  return children.disconnect.map((item: any) => {
    if (typeof item === "object" && item !== null) {
      return item.id ?? item.documentId ?? item;
    }
    return item;
  });
}

/**
 * Updates children whose parent relation was removed (e.g. from A's children list).
 * Sets ancestorSlugs=[] and pathKey=slug so they become root-level.
 */
async function updateDisconnectedChildren(
  strapi: Core.Strapi,
  childIds: ID[],
  locale: string
): Promise<void> {
  for (const childId of childIds) {
    if (updatingDescendants.has(childId)) continue;

    const child = await strapi.entityService.findOne(
      "api::treatment-ads-page.treatment-ads-page",
      childId,
      {
        fields: ["slug", "documentId", "publishedAt"] as any,
        locale,
      } as any
    );
    if (!child) continue;

    const childSlug =
      typeof (child as any).slug === "string" ? (child as any).slug : null;
    if (!childSlug) continue;

    const newAncestorSlugs: string[] = [];
    const newPathKey = childSlug;

    updatingDescendants.add(childId);
    try {
      const dataToUpdate = {
        ancestorSlugs: newAncestorSlugs,
        pathKey: newPathKey,
      };
      const childDocumentId =
        typeof (child as any).documentId === "string"
          ? ((child as any).documentId as string)
          : null;
      let wasPublished = Boolean((child as any).publishedAt);

      if (childDocumentId) {
        if (!wasPublished) {
          wasPublished = await hasPublishedVersion(
            strapi,
            childDocumentId,
            locale
          );
        }
        await updateDraftAndMaybeRepublish(
          strapi,
          childDocumentId,
          locale,
          dataToUpdate,
          wasPublished
        );
      } else {
        await strapi.entityService.update(
          "api::treatment-ads-page.treatment-ads-page",
          childId,
          { data: dataToUpdate, locale }
        );
      }

      // Recursive: children of the disconnected child now have a new root
      await updateDescendants(
        strapi,
        childId,
        childSlug,
        newAncestorSlugs,
        locale
      );
    } finally {
      updatingDescendants.delete(childId);
    }
  }
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

    // Validate parent exists (prevents "relation does not exist" error)
    if (parentId) {
      let parentExists = null;
      if (typeof parentId === "number" || /^\d+$/.test(String(parentId))) {
        parentExists = await strapi.entityService.findOne(
          "api::treatment-ads-page.treatment-ads-page",
          parentId,
          { fields: ["id"] as any }
        );
      } else {
        try {
          const docs = (strapi as any).documents(
            "api::treatment-ads-page.treatment-ads-page"
          );
          parentExists = await docs.findOne({
            documentId: parentId,
            status: "draft",
            fields: ["documentId"] as any,
          });
        } catch {
          parentExists = null;
        }
      }
      if (!parentExists) {
        throw new Error(
          `Die gewählte Elternseite existiert nicht oder ist ungültig. Bitte eine gültige Seite auswählen.`
        );
      }
    }

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

  async afterCreate(event: any) {
    const { result } = event;
    const strapi =
      (global as any).strapi ||
      require("@strapi/strapi").default ||
      require("@strapi/strapi");

    // Extract locale (admin doesn't always set `event.params.locale`)
    const locale = resolveEventLocale(event, "de");

    if (!result || !result.id) {
      return;
    }

    // In Strapi 5, publishing a document creates a new DB row with `publishedAt` set.
    // For descendant updates we want to operate on the DRAFT version, because only
    // there the parent relations for the whole tree are konsistent.
    const isPublished = Boolean((result as any).publishedAt);
    const documentId =
      typeof (result as any).documentId === "string"
        ? ((result as any).documentId as string)
        : null;

    let pageId = result.id as ID;
    let newSlug =
      typeof (result as any).slug === "string" ? (result as any).slug : null;
    let newAncestorSlugs = toStringArray((result as any).ancestorSlugs);

    if (documentId && isPublished) {
      try {
        const docs = (strapi as any).documents(
          "api::treatment-ads-page.treatment-ads-page"
        );
        const draft = await docs.findOne({
          documentId,
          locale,
          status: "draft",
          fields: ["id", "slug", "ancestorSlugs"] as any,
        });

        if (draft) {
          pageId = (draft as any).id as ID;
          newSlug =
            typeof (draft as any).slug === "string"
              ? ((draft as any).slug as string)
              : newSlug;
          newAncestorSlugs = toStringArray((draft as any).ancestorSlugs);
        }
      } catch {
        // If draft cannot be resolved we gracefully fall back to `result`.
      }
    }

    if (!newSlug) {
      return;
    }

    // Update descendants asynchronously to avoid HTTP timeout with many subpages.
    // The save response returns immediately; descendant pathKeys are updated in background.
    runAfterResponse(
      () =>
        updateDescendants(strapi, pageId, newSlug, newAncestorSlugs, locale),
      strapi
    );
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    const strapi =
      (global as any).strapi ||
      require("@strapi/strapi").default ||
      require("@strapi/strapi");

    // Extract locale (admin doesn't always set `event.params.locale`)
    const locale = resolveEventLocale(event, "de");

    // Strapi 5 Document Service (Admin) may pass where.documentId instead of where.id
    let pageId: ID | null = where?.id ?? null;
    if (!pageId && typeof where?.documentId === "string") {
      pageId = await resolveEntityIdFromDocumentId(
        strapi,
        where.documentId,
        locale
      );
    }
    if (!pageId) {
      return;
    }

    // Skip if we're updating descendants (to prevent loops)
    if (updatingDescendants.has(pageId)) {
      return;
    }

    // Get current page data to compare changes for this locale
    const current = await strapi.entityService.findOne(
      "api::treatment-ads-page.treatment-ads-page",
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

    const currentSlug =
      typeof (current as any).slug === "string" ? (current as any).slug : "";
    const currentAncestorSlugs = toStringArray((current as any).ancestorSlugs);

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

      // Parent is being removed (e.g. B removed from A's children list → B becomes root)
      const isDisconnecting =
        data.parent?.disconnect &&
        Array.isArray(data.parent.disconnect) &&
        data.parent.disconnect.length > 0 &&
        (!data.parent.connect || data.parent.connect.length === 0) &&
        (!data.parent.set || data.parent.set.length === 0);

      if (extractedParentId === null && !isDisconnecting) {
        newParentId = currentParentId;
      } else {
        // Parent changed or removed (disconnect) → recalculate ancestorSlugs/pathKey
        parentChanged = true;
        newParentId = extractedParentId;

        // Validate parent exists (prevents "relation does not exist" error)
        if (newParentId) {
          let parentExists = null;
          if (
            typeof newParentId === "number" ||
            /^\d+$/.test(String(newParentId))
          ) {
            parentExists = await strapi.entityService.findOne(
              "api::treatment-ads-page.treatment-ads-page",
              newParentId,
              { fields: ["id"] as any }
            );
          } else {
            try {
              const docs = (strapi as any).documents(
                "api::treatment-ads-page.treatment-ads-page"
              );
              parentExists = await docs.findOne({
                documentId: newParentId,
                status: "draft",
                fields: ["documentId"] as any,
              });
            } catch {
              parentExists = null;
            }
          }
          if (!parentExists) {
            throw new Error(
              `Die gewählte Elternseite existiert nicht oder ist ungültig. Bitte eine gültige Seite auswählen.`
            );
          }
        }

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

    // Payload for afterUpdate: descendants need pathKey/ancestorSlugs update
    const needDescendantsUpdate = slugChanged || parentChanged;
    (event.params as any)._descendantsNeedUpdate = needDescendantsUpdate;
    if (needDescendantsUpdate) {
      const finalAncestorSlugs =
        data.ancestorSlugs !== undefined
          ? data.ancestorSlugs
          : toStringArray((current as any).ancestorSlugs);
      const finalSlug = newSlug || currentSlug;
      (event.params as any)._descendantsUpdatePayload = {
        pageId,
        newSlug: finalSlug,
        newAncestorSlugs: finalAncestorSlugs,
        locale,
      };
    }
  },

  async afterUpdate(event: any) {
    const { data } = event.params;
    const strapi =
      (global as any).strapi ||
      require("@strapi/strapi").default ||
      require("@strapi/strapi");
    const locale = resolveEventLocale(event, "de");

    // When parent A removes a child (children: { disconnect: [B] }), B is not
    // automatically updated – we must set B's ancestorSlugs/pathKey manually.
    if ("children" in data && data.children) {
      const disconnectedIds = extractDisconnectedChildIds(data.children);
      if (disconnectedIds.length > 0) {
        await updateDisconnectedChildren(strapi, disconnectedIds, locale);
      }
    }

    // When slug or parent changed, all descendants must be updated.
    // Runs synchronously with parallelized sibling updates to stay under timeout.
    const payload = (event.params as any)._descendantsUpdatePayload;
    if (payload?.pageId && payload?.newSlug) {
      await updateDescendants(
        strapi,
        payload.pageId,
        payload.newSlug,
        payload.newAncestorSlugs ?? [],
        payload.locale ?? locale
      );
    }
  },
};
