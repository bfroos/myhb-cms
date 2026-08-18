/**
 * location-treatment-page lifecycles
 *
 * Verhindert doppelte Overrides fuer dieselbe Kombination aus Standort und
 * Behandlungsseite. Details und Grenzen des Guards:
 * utils/locationTreatmentPageUniqueness.ts
 */
import { assertNoDuplicateOverride } from "../../../../utils/locationTreatmentPageUniqueness";

export default {
  async beforeCreate(event: any) {
    await assertNoDuplicateOverride(event);
  },
  async beforeUpdate(event: any) {
    await assertNoDuplicateOverride(event);
  },
};
