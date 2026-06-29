/**
 * One-time migration controller.
 *
 * Copies the (locale-independent) parent relation from the German source
 * locale onto the requested target locales, recomputes pathKey/ancestorSlugs
 * and publishes each affected entry.
 *
 * Background: the `parent` relation is stored per locale-entry. Translated
 * treatment pages were created without a parent, so their published pathKey
 * collapsed to the bare slug (category segment missing). This migration sets
 * the parent for tr/ar from the German tree and republishes with the correct
 * hierarchical pathKey.
 *
 * Trigger (one-time):
 *   GET /api/migrate-treatment-parents?token=<SECRET>&dryRun=true
 *   GET /api/migrate-treatment-parents?token=<SECRET>&locales=tr,ar
 *
 * Remove this controller + its route once the migration has run.
 */

import type { Context } from "koa";
import { computePathKeyData } from "../../../utils/treatmentPagePathUtils";

const UID = "api::treatment-page.treatment-page" as const;
const SECRET = "myhb-parent-migration-2026-7Kx9";

export default {
  async migrateParents(ctx: Context) {
    const {
      token,
      locales: localesParam,
      dryRun,
    } = ctx.query as {
      token?: string;
      locales?: string;
      dryRun?: string;
    };

    if (token !== SECRET) {
      return ctx.unauthorized("invalid token");
    }

    const targetLocales = localesParam
      ? String(localesParam)
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
      : ["tr", "ar"];
    const isDry = String(dryRun) === "true";

    const docs = strapi.documents(UID as any);

    // Load the German tree (source of truth) ordered parents-first.
    const deEntries = (await docs.findMany({
      locale: "de",
      status: "draft",
      fields: ["slug", "name", "ancestorSlugs"],
      populate: { parent: { fields: ["documentId", "slug"] } } as any,
      limit: 9999,
    })) as any[];

    const sorted = [...deEntries].sort(
      (a, b) =>
        (Array.isArray(a.ancestorSlugs) ? a.ancestorSlugs.length : 0) -
        (Array.isArray(b.ancestorSlugs) ? b.ancestorSlugs.length : 0)
    );

    const report: any = {
      dryRun: isDry,
      locales: targetLocales,
      counts: { processed: 0, created: 0, skipped: 0, errors: 0 },
      processed: [],
      created: [],
      skipped: [],
      errors: [],
    };

    for (const locale of targetLocales) {
      for (const de of sorted) {
        const documentId = de.documentId as string;
        const parentDocId = de.parent?.documentId ?? null;
        try {
          const entry = (await docs.findOne({
            documentId,
            locale,
            status: "draft",
            fields: ["slug"],
          })) as any;

          if (!entry) {
            // Only auto-create missing top-level category pages (needed as
            // ancestors). Missing child translations are skipped on purpose.
            if (parentDocId !== null) {
              report.skipped.push({
                documentId,
                slug: de.slug,
                locale,
                reason: "no translation (child)",
              });
              report.counts.skipped += 1;
              continue;
            }
            if (isDry) {
              report.created.push({ documentId, slug: de.slug, locale, dry: true });
              report.counts.created += 1;
              continue;
            }
            await docs.update({
              documentId,
              locale,
              data: { name: de.name, slug: de.slug } as any,
            });
            report.created.push({ documentId, slug: de.slug, locale });
            report.counts.created += 1;
          }

          if (!isDry) {
            await docs.update({
              documentId,
              locale,
              data: { parent: parentDocId } as any,
            });
          }

          const { pathKey, ancestorSlugs } = await computePathKeyData(
            documentId,
            UID as any,
            locale,
            strapi
          );

          if (!isDry && pathKey) {
            await docs.update({
              documentId,
              locale,
              data: { pathKey, ancestorSlugs } as any,
            });
            await docs.publish({ documentId, locale });
          }

          report.processed.push({ documentId, slug: de.slug, locale, pathKey });
          report.counts.processed += 1;
        } catch (e: any) {
          report.errors.push({
            documentId,
            slug: de.slug,
            locale,
            error: String(e?.message ?? e),
          });
          report.counts.errors += 1;
        }
      }
    }

    return report;
  },
};
