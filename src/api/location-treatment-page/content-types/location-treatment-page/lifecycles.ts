/**
 * location-treatment-page lifecycles
 *
 * Verhindert doppelte Overrides fuer dieselbe Kombination aus Standort und
 * Behandlungsseite. Details und Grenzen des Guards:
 * utils/locationTreatmentPageUniqueness.ts
 */
import { assertNoDuplicateOverride } from "../../../../utils/locationTreatmentPageUniqueness";
import { LOCATION_TREATMENT_PAGE_UID } from "../../../../utils/locationTreatmentPageBlocks";

export default {
  async beforeCreate(event: any) {
    await assertNoDuplicateOverride(event, LOCATION_TREATMENT_PAGE_UID);
  },
  async beforeUpdate(event: any) {
    await assertNoDuplicateOverride(event, LOCATION_TREATMENT_PAGE_UID);
  },
};
