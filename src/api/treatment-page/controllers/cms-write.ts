/**
 * In-place write endpoint (prevention for the "delete + recreate" data-loss issue).
 *
 * The MCP bridge cannot update Strapi entries in place (Strapi v5 needs PUT,
 * the bridge only does POST/PATCH→405), so content edits previously used
 * delete-and-recreate — which removed the live German page and orphaned its
 * translations. This endpoint lets the bridge UPDATE an entry in place (and
 * optionally publish), so deletion is never required for an edit.
 *
 * Auth: requires a valid Strapi API token (default route auth). No secret in
 * the repo. uid is restricted to an allowlist.
 *
 *   POST /api/cms-update-entry
 *   body: { uid, documentId, locale, data, publish?: boolean }
 */

import type { Context } from "koa";

const ALLOWED_UIDS = new Set<string>([
  "api::treatment-page.treatment-page",
  "api::treatment-ads-page.treatment-ads-page",
]);

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
};
