/**
 * In-place write endpoints + translation/media audit.
 *
 *   POST /api/cms-update-entry
 *     body: { uid, documentId, locale, data, publish?: boolean }
 *
 *   POST /api/cms-propagate-media
 *     body: { documentIds: string[], fromLocale?: "de", toLocales?: string[], publish?: boolean }
 *     Copies hero.cover / treatmentDetails.image / benefits.media from the
 *     source locale onto every existing target-locale version. Reads the FULL
 *     target component and re-sends it with the media added, so localized text
 *     is preserved (never nulled).
 *
 *   GET /api/cms-audit-translations?token=<SECRET>
 *     Returns, per German doc, for each locale: exists / has hero text /
 *     has hero image / published.
 */

import type { Context } from "koa";

const ALLOWED_UIDS = new Set<string>([
  "api::treatment-page.treatment-page",
  "api::treatment-ads-page.treatment-ads-page",
]);

const TP_UID = "api::treatment-page.treatment-page";
const DEFAULT_LOCALES = ["en", "tr", "ar", "nl", "fr"];
const AUDIT_LOCALES = ["de", "en", "tr", "ar", "nl", "fr"];
const AUDIT_TOKEN = "myhb-audit-2026";

export default {
  async updateEntry(ctx: Context) {
    const body = (ctx.request as any).body ?? {};
    const { uid, documentId, locale, data, publish } = body as {
      uid?: string;
      documentId?: string;
      locale?: string;
      data?: Record<string, unknown>;
      publish?: boolean;
    };

    if (!uid || !ALLOWED_UIDS.has(uid)) return ctx.badRequest("uid missing or not allowed");
    if (!documentId || !locale || !data || typeof data !== "object") {
      return ctx.badRequest("documentId, locale and data are required");
    }

    const docs = strapi.documents(uid as any);
    try {
      const updated = await docs.update({ documentId, locale, data: data as any });
      let published = false;
      if (publish) {
        await docs.publish({ documentId, locale });
        published = true;
      }
      return {
        ok: true,
        documentId,
        locale,
        published,
        slug: (updated as any)?.slug ?? null,
        pathKey: (updated as any)?.pathKey ?? null,
      };
    } catch (e: any) {
      return ctx.badRequest("update failed", { error: String(e?.message ?? e) });
    }
  },

  async propagateMedia(ctx: Context) {
    const body = (ctx.request as any).body ?? {};
    const {
      documentIds,
      fromLocale = "de",
      toLocales = DEFAULT_LOCALES,
      publish = false,
    } = body as {
      documentIds?: string[];
      fromLocale?: string;
      toLocales?: string[];
      publish?: boolean;
    };

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return ctx.badRequest("documentIds[] required");
    }

    const docs = strapi.documents(TP_UID as any);
    const report: any[] = [];
    const fullPop = {
      hero: { populate: "*" },
      treatmentDetails: { populate: "*" },
      benefits: { populate: "*" },
    } as any;

    for (const documentId of documentIds) {
      try {
        const src = (await docs.findOne({
          documentId,
          locale: fromLocale,
          status: "draft",
          populate: fullPop,
        })) as any;
        if (!src) {
          report.push({ documentId, error: `no ${fromLocale} version` });
          continue;
        }
        const heroCover = src?.hero?.cover?.id ?? null;
        const tdImage = src?.treatmentDetails?.image?.id ?? null;
        const benMedia = src?.benefits?.media?.id ?? null;

        for (const locale of toLocales) {
          const loc = (await docs.findOne({
            documentId,
            locale,
            status: "draft",
            populate: fullPop,
          })) as any;
          if (!loc) {
            report.push({ documentId, locale, skipped: "no translation" });
            continue;
          }

          const data: Record<string, unknown> = {};
          // Merge: re-send the FULL existing component + the media id, so no
          // localized field is lost.
          if (heroCover && loc?.hero) {
            data.hero = { ...loc.hero, cover: heroCover };
          }
          if (tdImage && loc?.treatmentDetails) {
            data.treatmentDetails = { ...loc.treatmentDetails, image: tdImage };
          }
          if (benMedia && loc?.benefits) {
            data.benefits = { ...loc.benefits, media: benMedia };
          }
          if (Object.keys(data).length === 0) {
            report.push({ documentId, locale, set: [] });
            continue;
          }
          await docs.update({ documentId, locale, data: data as any });
          let published = false;
          if (publish) {
            await docs.publish({ documentId, locale });
            published = true;
          }
          report.push({ documentId, locale, set: Object.keys(data), published });
        }
      } catch (e: any) {
        report.push({ documentId, error: String(e?.message ?? e) });
      }
    }
    return { ok: true, fromLocale, count: documentIds.length, report };
  },

  async auditTranslations(ctx: Context) {
    const { token } = ctx.query as { token?: string };
    if (token !== AUDIT_TOKEN) return ctx.unauthorized("invalid token");

    const docs = strapi.documents(TP_UID as any);
    const byLocale: Record<string, Map<string, any>> = {};
    for (const locale of AUDIT_LOCALES) {
      const list = (await docs.findMany({
        locale,
        status: "draft",
        fields: ["internalLabel", "slug", "publishedAt"],
        populate: {
          hero: { fields: ["headline"], populate: { cover: { fields: ["id"] } } },
        } as any,
        limit: 9999,
      })) as any[];
      byLocale[locale] = new Map(list.map((x) => [x.documentId, x]));
    }

    const deList = Array.from(byLocale["de"].values());
    const rows = deList.map((de: any) => {
      const row: any = { documentId: de.documentId, label: de.internalLabel, locales: {} };
      for (const locale of AUDIT_LOCALES) {
        const e = byLocale[locale].get(de.documentId);
        if (!e) {
          row.locales[locale] = { exists: false };
        } else {
          row.locales[locale] = {
            exists: true,
            text: !!e?.hero?.headline,
            image: !!e?.hero?.cover,
            published: !!e?.publishedAt,
          };
        }
      }
      return row;
    });

    return { ok: true, locales: AUDIT_LOCALES, count: rows.length, rows };
  },
};
