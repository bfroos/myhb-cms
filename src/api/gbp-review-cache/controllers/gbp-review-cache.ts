/**
 * gbp-review-cache controller
 *
 * Not used directly by the frontend. This collection exists to store cached payloads
 * for Google Business Profile (GBP) reviews.
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::gbp-review-cache.gbp-review-cache"
);
