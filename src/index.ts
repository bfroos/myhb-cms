import {
  isTreatmentPageUid,
  syncDraftPathKeysForDocument,
  syncPathKeysForDocument,
  cascadeUpdateDescendants,
  hasChildrenInLocale,
} from "./utils/treatmentPagePathUtils";

// ============================================================================
// Helper Functions
// ============================================================================

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

// ============================================================================
// Component Sanitization Functions
// ============================================================================

function sanitizeSharedButton(component: any) {
  if (!isObject(component)) return;

  const RELATION_KEYS = ["page", "treatment", "location", "product"] as const;
  // `target` was renamed to `method` in shared.button
  const method = component.method ?? component.target;
  const hasAnyRelation = RELATION_KEYS.some((k) => Boolean(component[k]));

  if (method === "action") {
    // Action: keep only `action`, clear all link-ish fields
    component.url = null;
    component.anchor = null;
    component.targetType = null;
    component.singleType = null;
    component.collection = null;
    for (const key of RELATION_KEYS) {
      component[key] = null;
    }
    // Keep booleans consistent (required fields in schema)
    component.openInNewWindow = false;
    component.noFollow = false;
    return;
  }

  if (method === "external-link") {
    // External: action must not be persisted
    component.action = null;
    // External: keep url/anchor, clear internal link fields/relations
    component.targetType = null;
    component.singleType = null;
    component.collection = null;
    for (const key of RELATION_KEYS) {
      component[key] = null;
    }
    return;
  }

  if (method === "internal-link") {
    // Internal: action must not be persisted
    component.action = null;
    // Internal: clear url, keep anchor (useful for in-page anchors), keep only selected relation
    component.url = null;

    let targetType =
      typeof component.targetType === "string"
        ? component.targetType
        : undefined;
    const singleType =
      typeof component.singleType === "string"
        ? component.singleType
        : undefined;
    const collection =
      typeof component.collection === "string"
        ? component.collection
        : undefined;

    // Backward-compatible inference for older records (before targetType existed)
    if (!targetType) {
      if (singleType) {
        targetType = "single-type";
      } else if (collection || hasAnyRelation) {
        targetType = "collection";
      } else {
        // Default aligns with schema default
        targetType = "collection";
      }
    }

    component.targetType = targetType;

    if (targetType === "single-type") {
      // Single type: keep only `singleType`, clear all relations + collection
      component.collection = null;
      for (const key of RELATION_KEYS) {
        component[key] = null;
      }
      return;
    }

    // Collection target: clear singleType and keep only selected relation
    component.singleType = null;
    for (const key of RELATION_KEYS) {
      if (collection !== key) {
        component[key] = null;
      }
    }
  }
}

function sanitizeHighlightsStrip(component: any) {
  if (!isObject(component)) return;

  const type = component.type;
  if (type === "numbers") {
    component.iconItems = [];
  } else if (type === "icons") {
    component.numberItems = [];
  } else {
    component.iconItems = [];
    component.numberItems = [];
  }
}

function sanitizeBlogImage(component: any) {
  if (!isObject(component)) return;

  if (!component.fixedImageAspectRatio) {
    component.imageJustify = null;
  }
}

function sanitizeMediaCard(component: any) {
  if (!isObject(component)) return;

  // captionTitle and captionDescription are only visible when mediaCaption === true
  if (!component.mediaCaption) {
    component.captionTitle = null;
    component.captionDescription = null;
  }

  // contentAlignment is only visible when fixedImageAspectRatio === true
  if (!component.fixedImageAspectRatio) {
    component.contentAlignment = null;
  }
}

function sanitizeTreatmentPlanStep(component: any) {
  if (!isObject(component)) return;

  const type = component.type;

  if (type === "step") {
    // Only step type shows: week, description, treatments
    component.followUpPlanText = null;
    component.endOfPlanText = null;
  } else if (type === "follow-up-plan") {
    // Only follow-up-plan shows: followUpPlanText
    component.week = null;
    component.description = null;
    component.treatments = null;
    component.endOfPlanText = null;
  } else if (type === "end-of-plan") {
    // Only end-of-plan shows: endOfPlanText
    component.week = null;
    component.description = null;
    component.treatments = null;
    component.followUpPlanText = null;
  } else {
    // Fallback: clear all conditional fields if type is invalid
    component.week = null;
    component.description = null;
    component.treatments = null;
    component.followUpPlanText = null;
    component.endOfPlanText = null;
  }
}

// ============================================================================
// Component Sanitization Registry
// ============================================================================

/**
 * Registry mapping component UIDs to their sanitization functions.
 * Add new sanitization functions here by adding an entry to this object.
 */
const COMPONENT_SANITIZERS: Record<string, (component: any) => void> = {
  "shared.button": sanitizeSharedButton,
  "blocks.highlights-strip": sanitizeHighlightsStrip,
  "blog.image": sanitizeBlogImage,
  "blocks.media-card": sanitizeMediaCard,
  "treatment-plan.treatment-plan-step": sanitizeTreatmentPlanStep,
  // Add more component sanitizers here as needed:
  // "blocks.my-component": sanitizeMyComponent,
};

// ============================================================================
// Sanitization Logic
// ============================================================================

/**
 * Sanitizes a component if a sanitizer exists for its UID.
 */
function sanitizeComponent(component: any, componentUid: string) {
  const sanitizer = COMPONENT_SANITIZERS[componentUid];
  if (sanitizer && isObject(component)) {
    sanitizer(component);
  }
}

/**
 * Recursively sanitizes all components in a data structure.
 * This function finds all components (including in dynamic zones) and sanitizes them.
 */
function sanitizeDataRecursive(data: any) {
  if (!isObject(data)) return;

  const sanitizeRecursive = (obj: any) => {
    if (!isObject(obj)) return;

    // Check if this is a component in a dynamic zone
    if (typeof obj.__component === "string") {
      sanitizeComponent(obj, obj.__component);
    }

    // Recursively check all properties
    for (const [key, value] of Object.entries(obj)) {
      if (key === "__component") continue;

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (isObject(item)) {
            sanitizeRecursive(item);
          }
        });
      } else if (isObject(value)) {
        sanitizeRecursive(value);
      }
    }
  };

  sanitizeRecursive(data);
}

// ============================================================================
// Strapi Lifecycle Hooks
// ============================================================================

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: any) {
    if (strapi.documents && typeof strapi.documents.use === "function") {
      // -----------------------------------------------------------------------
      // Middleware 1: Component sanitization on create / update
      // -----------------------------------------------------------------------
      strapi.documents.use(async (context: any, next: any) => {
        const { uid, action, params } = context;

        // Only process API content types for create/update operations
        if (
          typeof uid === "string" &&
          uid.startsWith("api::") &&
          (action === "create" || action === "update")
        ) {
          const data = params?.data;
          if (data) {
            sanitizeDataRecursive(data);
          }
        }

        return next();
      });

      // -----------------------------------------------------------------------
      // Middleware 2: pathKey / ancestorSlugs cascade on publish
      //
      // Re-entry guard: when we republish children during the cascade we must
      // not re-enter this middleware for those documents, otherwise we'd loop
      // infinitely.  We track document IDs that are currently being processed
      // in a module-level Set so it survives across middleware invocations.
      // -----------------------------------------------------------------------
      const pathKeySyncInProgress = new Set<string>();

      strapi.documents.use(async (context: any, next: any) => {
        const { uid, action, params } = context;

        if (
          action !== "publish" ||
          typeof uid !== "string" ||
          !isTreatmentPageUid(uid)
        ) {
          return next();
        }

        const documentId: string | undefined = params?.documentId;
        if (!documentId) return next();
        const locale: string | undefined =
          typeof params?.locale === "string" ? params.locale : undefined;
        if (!locale) return next();

        // Skip if this publish was triggered by our own cascade
        if (pathKeySyncInProgress.has(documentId)) {
          return next();
        }

        // Snapshot published state/path before publish.
        const publishedBefore = await strapi.documents(uid).findOne({
          documentId,
          locale,
          status: "published",
          fields: ["documentId", "pathKey"],
        });
        const wasPublishedBefore = Boolean(publishedBefore);
        const publishedPathKeyBefore = publishedBefore?.pathKey ?? null;

        // First publish: write path fields to draft before Strapi publishes it.
        // This ensures the first published version already contains pathKey.
        if (!wasPublishedBefore) {
          await syncDraftPathKeysForDocument(documentId, uid, locale, strapi);
        }

        // Let Strapi publish the document first
        const result = await next();

        try {
          // 1. Update pathKey on the document that was just published
          pathKeySyncInProgress.add(documentId);
          await syncPathKeysForDocument(
            documentId,
            uid,
            locale,
            strapi,
            pathKeySyncInProgress,
            wasPublishedBefore
          );

          // 2. Cascade only when descendants exist and pathKey actually changed.
          const hasChildren = await hasChildrenInLocale(
            documentId,
            uid,
            locale,
            strapi
          );

          if (hasChildren) {
            const publishedAfter = await strapi.documents(uid).findOne({
              documentId,
              locale,
              status: "published",
              fields: ["pathKey"],
            });
            const publishedPathKeyAfter = publishedAfter?.pathKey ?? null;

            const pathKeyChanged =
              !wasPublishedBefore ||
              publishedPathKeyBefore !== publishedPathKeyAfter;

            if (pathKeyChanged) {
              await cascadeUpdateDescendants(
                documentId,
                uid,
                locale,
                strapi,
                pathKeySyncInProgress
              );
            }
          }
        } catch (err) {
          strapi.log.error(
            `[pathKey] Failed to sync pathKeys for documentId=${documentId}: ${err}`
          );
        } finally {
          pathKeySyncInProgress.delete(documentId);
        }

        return result;
      });
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: any) {
    // Component sanitization is handled by Document Service Middleware in register()
    // No additional setup needed here
  },
};
