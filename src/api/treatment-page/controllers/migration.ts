/**
 * One-time migration controller.
 *
 * Copies the parent relation from the German source locale onto the requested
 * target locales, sanitizes invalid slugs, recomputes pathKey/ancestorSlugs and
 * publishes each affected entry. Remove this controller + its route once the
 * migration has run.
 *
 * Trigger:
 *   GET /api/migrate-treatment-parents?token=<SECRET>&dryRun=true
 *   GET /api/migrate-treatment-parents?token=<SECRET>&locales=tr,ar
 */

import type { Context } from "koa";
import { computePathKeyData } from "../../../utils/treatmentPagePathUtils";

const UID = "api::treatment-page.treatment-page" as const;
const SECRET = "myhb-parent-migration-2026-7Kx9";
const SLUG_RE = /^[A-Za-z0-9-_.~]+$/;

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
      counts: { processed: 0, created: 0, skipped: 0, slugFixed: 0, errors: 0 },
      processed: [],
      created: [],
      skipped: [],
      slugFixed: [],
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

          // Sanitize an invalid/empty slug (e.g. non-latin chars) by falling
          // back to the German slug, which is guaranteed to match the schema
          // regex. Without this the update/publish fails validation.
          const currentSlug = entry?.slug as string | null | undefined;
          const slugData: Record<string, unknown> = { parent: parentDocId };
          if (!currentSlug || !SLUG_RE.test(currentSlug)) {
            if (de.slug && SLUG_RE.test(de.slug)) {
              slugData.slug = de.slug;
              if (!isDry) {
                report.slugFixed.push({
                  documentId,
                  locale,
                  from: currentSlug ?? null,
                  to: de.slug,
                });
                report.counts.slugFixed += 1;
              }
            }
          }

          if (!isDry) {
            await docs.update({
              documentId,
              locale,
              data: slugData as any,
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
