import { assertNoDuplicateOverride } from "../../../../utils/locationTreatmentPageUniqueness";
import { LOCATION_TREATMENT_ADS_PAGE_UID } from "../../../../utils/locationTreatmentPageBlocks";

export default {
  async beforeCreate(event: any) {
    await assertNoDuplicateOverride(event, LOCATION_TREATMENT_ADS_PAGE_UID);
  },
  async beforeUpdate(event: any) {
    await assertNoDuplicateOverride(event, LOCATION_TREATMENT_ADS_PAGE_UID);
  },
};
