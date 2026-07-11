/**
 * price lifecycles
 *
 * Enforces that monetary values are always strictly positive:
 *   - basePrice must be > 0 (it is required, so it is always present on create)
 *   - startingPrice, when provided, must be > 0
 *
 * On beforeUpdate the payload may be partial, so each field is only validated
 * when it is actually present in the incoming data.
 */

import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

function assertValidPrices(data: Record<string, unknown> | undefined): void {
  if (!data) {
    return;
  }

  const { basePrice, startingPrice } = data as {
    basePrice?: number | string | null;
    startingPrice?: number | string | null;
  };

  if (basePrice !== undefined && basePrice !== null && Number(basePrice) <= 0) {
    throw new ApplicationError('basePrice must be greater than 0.');
  }

  if (startingPrice !== undefined && startingPrice !== null && Number(startingPrice) <= 0) {
    throw new ApplicationError('startingPrice must be greater than 0 when provided.');
  }
}

export default {
  beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    assertValidPrices(event.params.data);
  },
  beforeUpdate(event: { params: { data?: Record<string, unknown> } }) {
    assertValidPrices(event.params.data);
  },
};
