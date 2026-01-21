type GbpStarRating =
  | "STAR_RATING_UNSPECIFIED"
  | "ONE"
  | "TWO"
  | "THREE"
  | "FOUR"
  | "FIVE";

type GbpReview = {
  name?: string; // resource name
  comment?: string;
  starRating?: GbpStarRating;
  createTime?: string;
  updateTime?: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
  };
};

type GbpListReviewsResponse = {
  reviews?: GbpReview[];
  totalReviewCount?: number;
  averageRating?: number;
  nextPageToken?: string;
};

function starRatingToNumber(starRating: GbpStarRating | undefined): number {
  switch (starRating) {
    case "ONE":
      return 1;
    case "TWO":
      return 2;
    case "THREE":
      return 3;
    case "FOUR":
      return 4;
    case "FIVE":
      return 5;
    default:
      return 5;
  }
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing env vars: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("OAuth token exchange failed: missing access_token");
  }
  return json.access_token;
}

function buildCacheKey(locationName: string, locale: string, limit: number) {
  return `gbp:${locationName}:${locale}:${limit}`;
}

export default {
  async index(ctx: any) {
    const locationName = (ctx.query?.locationName ?? "").toString().trim();
    const locale = (ctx.query?.locale ?? "de").toString().trim();
    const limitRaw = ctx.query?.limit;
    const limit = Math.max(
      1,
      Math.min(50, Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 6)
    );

    if (
      !locationName.startsWith("accounts/") ||
      !locationName.includes("/locations/")
    ) {
      return ctx.badRequest(
        "Invalid locationName. Expected format like: accounts/{accountId}/locations/{locationId}"
      );
    }

    const cacheKey = buildCacheKey(locationName, locale, limit);
    const now = new Date();

    const cacheQuery = strapi.db.query(
      "api::gbp-review-cache.gbp-review-cache"
    );

    const cached = await cacheQuery.findOne({ where: { cacheKey } });
    if (cached?.expiresAt) {
      const expiresAt = new Date(cached.expiresAt);
      if (Number.isFinite(expiresAt.valueOf()) && expiresAt > now) {
        ctx.set("X-Cache", "HIT");
        return cached.payload;
      }
    }

    try {
      const accessToken = await getAccessToken();
      const url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=${limit}&orderBy=updateTime desc`;

      const res = await fetch(url, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GBP reviews fetch failed (${res.status}): ${text}`);
      }

      const json = (await res.json()) as GbpListReviewsResponse;
      const reviews = (json.reviews ?? [])
        .filter((r) => (r.comment ?? "").trim().length > 0)
        .slice(0, limit)
        .map((r) => ({
          id: r.name ?? `${locationName}:${r.createTime ?? ""}`,
          rating: starRatingToNumber(r.starRating),
          author: r.reviewer?.displayName ?? "Google User",
          text: r.comment ?? "",
          source: "google",
          sourceUrl: undefined,
          meta: {
            createTime: r.createTime,
            updateTime: r.updateTime,
          },
        }));

      const payload = {
        locationName,
        locale,
        limit,
        fetchedAt: now.toISOString(),
        reviews,
      };

      const expiresAt = new Date(now.valueOf() + 24 * 60 * 60 * 1000); // 24h

      if (cached?.id) {
        await cacheQuery.update({
          where: { id: cached.id },
          data: { payload, expiresAt, cacheKey },
        });
      } else {
        await cacheQuery.create({
          data: { payload, expiresAt, cacheKey },
        });
      }

      ctx.set("X-Cache", "MISS");
      return payload;
    } catch (err: any) {
      // If Google fails but we have stale cache, serve stale (Aktualität ist egal).
      if (cached?.payload) {
        ctx.set("X-Cache", "STALE");
        return cached.payload;
      }

      strapi.log.error("[gbp-reviews] " + (err?.message ?? String(err)));
      return ctx.internalServerError("Failed to fetch GBP reviews");
    }
  },
};
