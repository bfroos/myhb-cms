import { LOCATION_TYPE_TO_TREATMENT_TYPES } from "./locationTreatmentRouting";
import {
  filterPathKeysForLocation,
  type ConsolidationContext,
} from "./locationConsolidation";

// Which treatments a location offers - decided by the location type.
// (Quelle: locationTreatmentRouting.ts; hier nur fuer bestehende Importe.)
export const locationTypeToTreatmentTypes = LOCATION_TYPE_TO_TREATMENT_TYPES;

type AvailabilityParams = {
  locationType?: string | null;
  locale?: string;
  status?: "published" | "draft";
  /**
   * Standort + Konsolidierungskontext: Behandlungen, die in derselben Stadt
   * ein anderer Standort bedient (Köln: OPs -> MediaPark, nichtoperativ ->
   * Arcaden), fallen heraus. Ohne beides: Verhalten wie bisher.
   */
  location?: any;
  consolidation?: ConsolidationContext;
};

export async function getAvailableTreatmentPathKeys(
  strapi: any,
  { locationType, locale, status, location, consolidation }: AvailabilityParams
): Promise<string[]> {
  const allowedTreatmentTypes =
    locationTypeToTreatmentTypes[
      locationType as "lounge" | "center" | "clinic"
    ];

  if (!allowedTreatmentTypes || allowedTreatmentTypes.length === 0) {
    return [];
  }

  const treatments = await strapi
    .documents("api::treatment.treatment")
    .findMany({
      locale,
      status,
      fields: ["name"],
      filters: {
        type: {
          $in: allowedTreatmentTypes,
        },
        treatmentPage: {
          id: {
            $notNull: true,
          },
        },
      },
      populate: {
        treatmentPage: {
          fields: ["pathKey"],
        },
      },
    });

  const pathKeys: string[] = Array.from(
    new Set(
      (treatments || [])
        .map((treatment: any) => treatment?.treatmentPage?.pathKey)
        .filter(
          (pathKey: unknown): pathKey is string =>
            typeof pathKey === "string" && pathKey.length > 0
        )
    )
  );

  if (location && consolidation) {
    return filterPathKeysForLocation(consolidation, location, pathKeys);
  }
  return pathKeys;
}
