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
 * Returns all configured locale codes (e.g. ["de", "en"]).
 */
async function getAllLocales(strapi: any): Promise<string[]> {
  try {
    const locales = await strapi
      .plugin("i18n")
      .service("locales")
      .find();
    return (locales as Array<{ code: string }>).map((l) => l.code);
  } catch {
    return ["de"];
  }
}

/**
 * Updates `pathKey` and `ancestorSlugs` on both the draft and published
 * version of a document for every locale.
 *
 * Uses a re-entry guard (Set of documentIds currently being processed)
 * to prevent infinite publish loops when republishing children.
 */
export async function syncPathKeysForDocument(
  documentId: string,
  uid: TreatmentPageUid,
  strapi: any,
  inProgress: Set<string>
): Promise<void> {
  const locales = await getAllLocales(strapi);

  for (const locale of locales) {
    const { pathKey, ancestorSlugs } = await computePathKeyData(
      documentId,
      uid,
      locale,
      strapi
    );

    if (!pathKey) continue;

    await strapi.documents(uid).update({
      documentId,
      locale,
      data: { pathKey, ancestorSlugs } as any,
    });

    // If the document has a published version, republish to sync the published data.
    // The re-entry guard in the middleware prevents an infinite publish loop.
    const published = await strapi.documents(uid).findOne({
      documentId,
      locale,
      status: "published",
      fields: ["documentId"],
    });

    if (published) {
      inProgress.add(documentId);
      try {
        await strapi.documents(uid).publish({ documentId, locale });
      } finally {
        inProgress.delete(documentId);
      }
    }
  }
}

/**
 * Returns the documentIds of all direct children of a document.
 *
 * The `parent`/`children` relation is not localized (same across all locales),
 * but Strapi 5 only returns related documents that exist in the requested
 * locale when populating. To avoid missing children that only exist in a
 * subset of locales, we query across every configured locale and deduplicate.
 */
async function getChildDocumentIds(
  documentId: string,
  uid: TreatmentPageUid,
  strapi: any
): Promise<string[]> {
  const locales = await getAllLocales(strapi);
  const ids = new Set<string>();

  for (const locale of locales) {
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

    for (const child of (page as any)?.children ?? []) {
      if (child?.documentId) ids.add(child.documentId as string);
    }
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

  const childIds = await getChildDocumentIds(documentId, uid, strapi);

  for (const childId of childIds) {
    await syncPathKeysForDocument(childId, uid, strapi, inProgress);
    await cascadeUpdateDescendants(childId, uid, strapi, inProgress, depth + 1);
  }
}
