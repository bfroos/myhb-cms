type PreviewStatus = "draft" | "published";

export function getPreviewStatus(ctx: { query?: Record<string, unknown> }): PreviewStatus {
  return ctx.query?.status === "draft" ? "draft" : "published";
}
