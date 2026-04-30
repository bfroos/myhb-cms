const TREATMENT_PAGE_UIDS = [
  "api::treatment-page.treatment-page",
  "api::treatment-ads-page.treatment-ads-page",
] as const;

export type TreatmentPageUid = (typeof TREATMENT_PAGE_UIDS)[number];

export function isTreatmentPageUid(uid: string): uid is TreatmentPageUid {
  return (TREATMENT_PAGE_UIDS as readonly string[]).includes(uid);
}

/**
 * Walks the parent chain for a document in a given locale and returns
 * an ordered array of ancestor slugs (top → direct parent).
 *
 * Because `parent` is not localized, the relation is the same across locales,
 * but the `slug` of each ancestor must be fetched in the requested locale.
 */
async function buildAncestorSlugs(
  documentId: string,
  uid: TreatmentPageUid,
  locale: string,
  strapi: any,
  depth = 0
): Promise<string[]> {
  if (depth > 10) {
    strapi.log.warn(
      `[treatmentPagePathUtils] Max depth reached for documentId=${documentId}. Possible circular reference.`
    );
    return [];
  }

  const page = await strapi.documents(uid).findOne({
    documentId,
    locale,
    fields: ["slug"],
    populate: {
      parent: {
        fields: ["documentId", "slug"],
      },
    },
    status: "draft",
  });

  if (!page) return [];

  const parent = (page as any).parent;
  if (!parent?.documentId) return [];

  const parentAncestors = await buildAncestorSlugs(
    parent.documentId,
    uid,
    locale,
    strapi,
    depth + 1
  );

  return [...parentAncestors, parent.slug as string];
}

/**
 * Computes `pathKey` and `ancestorSlugs` for a document in a given locale.
 */
export async function computePathKeyData(
  documentId: string,
  uid: TreatmentPageUid,
  locale: string,
  strapi: any
): Promise<{ pathKey: string; ancestorSlugs: string[] }> {
  const page = await strapi.documents(uid).findOne({
    documentId,
    locale,
    fields: ["slug"],
    status: "draft",
  });

  if (!page?.slug) {
    return { pathKey: "", ancestorSlugs: [] };
  }

  const ancestorSlugs = await buildAncestorSlugs(
    documentId,
    uid,
    locale,
    strapi
  );

  const pathKey = [...ancestorSlugs, page.slug as string].join("/");

  return { pathKey, ancestorSlugs };
}

/**
 * Updates path fields on the draft version only (no publish).
 * Used before first publish so that the initial published version
 * already contains a correct pathKey.
 */
export async function syncDraftPathKeysForDocument(
  documentId: string,
  uid: TreatmentPageUid,
  locale: string,
  strapi: any
): Promise<void> {
  const { pathKey, ancestorSlugs } = await computePathKeyData(
    documentId,
    uid,
    locale,
    strapi
  );

  if (!pathKey) return;

  await strapi.documents(uid).update({
    documentId,
    locale,
    data: { pathKey, ancestorSlugs } as any,
  });
}

/**
 * Updates `pathKey` and `ancestorSlugs` on both the draft and published
 * version of a document for one locale.
 *
 * Uses a re-entry guard (Set of documentIds currently being processed)
 * to prevent infinite publish loops when republishing children.
 */
export async function syncPathKeysForDocument(
  documentId: string,
  uid: TreatmentPageUid,
  locale: string,
  strapi: any,
  inProgress: Set<string>,
  wasPublishedBefore?: boolean
): Promise<void> {
  const documentsService = strapi.documents(uid);
  const isPublishedBefore =
    wasPublishedBefore ??
    Boolean(
      await documentsService.findOne({
        documentId,
        locale,
        status: "published",
        fields: ["documentId"],
      })
    );

  // Safety: never touch locales that are not published yet.
  // Updating such locales can create a minimal draft (path fields only),
  // which may overwrite translated content on the first manual publish.
  if (!isPublishedBefore) return;

  const { pathKey, ancestorSlugs } = await computePathKeyData(
    documentId,
    uid,
    locale,
    strapi
  );

  if (!pathKey) return;

  await documentsService.update({
    documentId,
    locale,
    data: { pathKey, ancestorSlugs } as any,
  });

  const maxPublishAttempts = 3;
  let publishedWithFreshData = false;
  let lastPublishError: unknown = null;

  inProgress.add(documentId);
  try {
    for (let attempt = 1; attempt <= maxPublishAttempts; attempt += 1) {
      try {
        await documentsService.publish({ documentId, locale });

        const publishedAfter = await documentsService.findOne({
          documentId,
          locale,
          status: "published",
          fields: ["pathKey"],
        });

        if (publishedAfter?.pathKey === pathKey) {
          publishedWithFreshData = true;
          break;
        }
      } catch (error) {
        lastPublishError = error;
      }
    }
  } finally {
    inProgress.delete(documentId);
  }

  if (!publishedWithFreshData) {
    // Hard safety net: never leave previously published content in a lingering draft state.
    try {
      if (typeof documentsService.discardDraft === "function") {
        await documentsService.discardDraft({ documentId, locale });
      }
    } catch (discardError) {
      strapi.log.error(
        `[treatmentPagePathUtils] Failed to discard draft for documentId=${documentId}, locale=${locale}: ${discardError}`
      );
    }

    const publishErrorMessage =
      lastPublishError instanceof Error
        ? lastPublishError.message
        : String(lastPublishError ?? "unknown publish error");

    throw new Error(
      `[treatmentPagePathUtils] Failed to keep document published for documentId=${documentId}, locale=${locale}. Last publish error: ${publishErrorMessage}`
    );
  }
}

/**
 * Returns the documentIds of all direct children of a document.
 *
 * Returns children for one requested locale.
 */
async function getChildDocumentIds(
  documentId: string,
  uid: TreatmentPageUid,
  locale: string,
  strapi: any
): Promise<string[]> {
  const page = await strapi.documents(uid).findOne({
    documentId,
    locale,
    fields: [],
    populate: {
      children: {
        fields: ["documentId"],
      },
    },
    status: "draft",
  });

  const ids = new Set<string>();
  for (const child of (page as any)?.children ?? []) {
    if (child?.documentId) ids.add(child.documentId as string);
  }

  return Array.from(ids);
}

/**
 * Recursively syncs `pathKey` and `ancestorSlugs` for all descendants
 * of a given document.
 */
export async function cascadeUpdateDescendants(
  documentId: string,
  uid: TreatmentPageUid,
  locale: string,
  strapi: any,
  inProgress: Set<string>,
  depth = 0
): Promise<void> {
  if (depth > 10) {
    strapi.log.warn(
      `[treatmentPagePathUtils] Max cascade depth reached for documentId=${documentId}.`
    );
    return;
  }

  const childIds = await getChildDocumentIds(documentId, uid, locale, strapi);

  for (const childId of childIds) {
    await syncPathKeysForDocument(childId, uid, locale, strapi, inProgress);
    await cascadeUpdateDescendants(
      childId,
      uid,
      locale,
      strapi,
      inProgress,
      depth + 1
    );
  }
}
