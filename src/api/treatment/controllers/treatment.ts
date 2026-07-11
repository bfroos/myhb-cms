/**
 * treatment controller
 *
 * Overrides `find` and `findOne` so that the `prices` relation is ALWAYS
 * returned server-side filtered by `isActive = true` and sorted by
 * `order:asc`, regardless of the populate/filter/sort params the client
 * sends. A client cannot loosen these constraints (e.g. it cannot request
 * inactive prices or a different ordering for this relation).
 */

import { factories } from '@strapi/strapi';

const FORCED_PRICES_POPULATE = {
  filters: { isActive: true },
  sort: ['order:asc'],
} as const;

/**
 * Returns a copy of the incoming query with the `prices` populate forced to
 * our constrained configuration. Any client-supplied `prices` populate is
 * discarded; other populate keys are preserved when populate is an object.
 */
function withForcedPricesPopulate(query: Record<string, any> | undefined): Record<string, any> {
  const incomingPopulate = query?.populate;

  const populate =
    incomingPopulate && typeof incomingPopulate === 'object' && !Array.isArray(incomingPopulate)
      ? { ...incomingPopulate }
      : {};

  populate.prices = { ...FORCED_PRICES_POPULATE };

  return { ...(query ?? {}), populate };
}

export default factories.createCoreController('api::treatment.treatment', () => ({
  async find(ctx) {
    ctx.query = withForcedPricesPopulate(ctx.query);
    // @ts-expect-error - super is available on the core controller factory
    return await super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = withForcedPricesPopulate(ctx.query);
    // @ts-expect-error - super is available on the core controller factory
    return await super.findOne(ctx);
  },
}));
