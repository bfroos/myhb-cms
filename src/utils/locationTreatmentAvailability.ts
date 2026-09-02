// Which treatments a location offers - decided by the location type.
export const locationTypeToTreatmentTypes: Record<
  "lounge" | "center" | "clinic",
  ("minimally-invasive" | "abulatory" | "operational")[]
> = {
  lounge: ["minimally-invasive"],
  center: ["minimally-invasive", "abulatory"],
  clinic: ["minimally-invasive", "abulatory", "operational"],
};

type AvailabilityParams = {
  locationType?: string | null;
  locale?: string;
  status?: "published" | "draft";
};

export async function getAvailableTreatmentPathKeys(
  strapi: any,
  { locationType, locale, status }: AvailabilityParams
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

  return Array.from(
    new Set(
      (treatments || [])
        .map((treatment: any) => treatment?.treatmentPage?.pathKey)
        .filter(
          (pathKey: unknown): pathKey is string =>
            typeof pathKey === "string" && pathKey.length > 0
        )
    )
  );
}
