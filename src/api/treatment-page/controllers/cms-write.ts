/**
 * In-place write endpoints (prevention for the "delete + recreate" data-loss
 * issue, plus media propagation across locales).
 *
 * The MCP bridge cannot update Strapi entries in place (Strapi v5 needs PUT,
 * the bridge only does POST/PATCH→405), so content edits previously used
 * delete-and-recreate. These endpoints let the bridge UPDATE in place.
 *
 *   POST /api/cms-update-entry
 *     body: { uid, documentId, locale, data, publish?: boolean }
 *
 *   POST /api/cms-propagate-media
 *     body: { documentIds: string[], fromLocale?: "de", toLocales?: string[], publish?: boolean }
 *     Copies hero.cover / treatmentDetails.image / benefits.media from the
 *     source locale onto every existing target-locale version (merge via
 *     component id, so localized text is preserved). Optionally publishes.
 */

import type { Context } from "koa";

const ALLOWED_UIDS = new Set<string>([
  "api::treatment-page.treatment-page",
  "api::treatment-ads-page.treatment-ads-page",
]);

const TP_UID = "api::treatment-page.treatment-page";
const DEFAULT_LOCALES = ["en", "tr", "ar", "nl", "fr"];

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

    if (!uid || !ALLOWED_UIDS.has(uid)) {
      return ctx.badRequest("uid missing or not allowed");
    }
    if (!documentId || !locale || !data || typeof data !== "object") {
      return ctx.badRequest("documentId, locale and data are required");
    }

    const docs = strapi.documents(uid as any);

    try {
      const updated = await docs.update({
        documentId,
        locale,
        data: data as any,
      });

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
      return ctx.badRequest("update failed", {
        error: String(e?.message ?? e),
      });
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

    for (const documentId of documentIds) {
      try {
        const src = (await docs.findOne({
          documentId,
          locale: fromLocale,
          status: "draft",
          populate: {
            hero: { populate: { cover: true } },
            treatmentDetails: { populate: { image: true } },
            benefits: { populate: { media: true } },
          } as any,
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
            populate: {
              hero: true,
              treatmentDetails: true,
              benefits: true,
            } as any,
          })) as any;

          if (!loc) {
            report.push({ documentId, locale, skipped: "no translation" });
            continue;
          }

          const data: Record<string, unknown> = {};
          if (heroCover && loc?.hero?.id) {
            data.hero = { id: loc.hero.id, cover: heroCover };
          }
          if (tdImage && loc?.treatmentDetails?.id) {
            data.treatmentDetails = { id: loc.treatmentDetails.id, image: tdImage };
          }
          if (benMedia && loc?.benefits?.id) {
            data.benefits = { id: loc.benefits.id, media: benMedia };
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
};
