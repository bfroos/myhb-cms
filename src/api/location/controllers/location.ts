/**
 * location controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { getLocationStatus } from "../../../utils/locationStatus";
import {
  locationFieldsForPage,
  locationPopulateForPage,
} from "../../../utils/queries/locationPopulate";
import { treatmentTeaserPopulate } from "../../../utils/queries/ui";
import { mediaPopulate } from "../../../utils/queries/strapi";

// Mapping von LocationType zu erlaubten TreatmentTypes
const locationTypeToTreatmentTypes: Record<
  "lounge" | "center" | "clinic",
  ("minimally-invasive" | "abulatory" | "operational")[]
> = {
  lounge: ["minimally-invasive"],
  center: ["minimally-invasive", "abulatory"],
  clinic: ["minimally-invasive", "abulatory", "operational"],
};

export default factories.createCoreController(
  "api::location.location",
  ({ strapi }) => ({
    async findWithCalendlyUrl(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };

      const locations = await strapi
        .documents("api::location.location")
        .findMany({
          locale,
          fields: ["name", "slug", "newOpeningDate", "timezone", "calendlyUrl"],
          filters: {
            calendlyUrl: {
              $notNull: true,
              $ne: "",
            },
            isBookingAllowed: {
              $eq: true,
            },
            city: {
              slug: {
                $notNull: true,
                $ne: "",
              },
            },
          },
          populate: {
            city: {
              fields: ["name", "slug", "federalState"],
            },
            address: true,
            buildingImage: mediaPopulate as object,
          },
        });

      const mappedLocations = (locations as any[]).map((location) => ({
        ...location,
        openingStatus: getLocationStatus(
          location.newOpeningDate,
          location.timezone || "Europe/Berlin"
        ),
      }));

      const filteredLocations = mappedLocations.filter(
        (location) => location.openingStatus !== "comingSoon"
      );

      return { data: filteredLocations };
    },
    async findByCityAndSlugWithTreatments(ctx: Context) {
      const { citySlug, locationSlug } = ctx.params as {
        citySlug: string;
        locationSlug: string;
      };
      const { locale } = ctx.query as { locale?: string };

      // Fetch location with all needed populate
      const location = await strapi
        .documents("api::location.location")
        .findFirst({
          locale,
          fields: locationFieldsForPage as any,
          filters: {
            slug: {
              $eq: locationSlug,
            },
            city: {
              slug: {
                $eq: citySlug,
              },
            },
          },
          populate: locationPopulateForPage as any,
        });

      if (!location) {
        ctx.notFound("Location not found");
        return;
      }

      const allowedTreatmentTypes =
        locationTypeToTreatmentTypes[
          location.type as "lounge" | "center" | "clinic"
        ];

      if (!allowedTreatmentTypes || allowedTreatmentTypes.length === 0) {
        return {
          data: {
            location,
            treatmentPages: [],
          },
        };
      }

      // Fetch treatments that match location type and have treatmentPage
      const treatments = await strapi
        .documents("api::treatment.treatment")
        .findMany({
          locale,
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
              ...(treatmentTeaserPopulate as any),
            } as object,
          },
        });

      const treatmentPages = (treatments || [])
        .map((treatment: any) => treatment.treatmentPage)
        .filter((page: any) => page !== null && page !== undefined);

      const locationOpenStatus = getLocationStatus(
        location.newOpeningDate,
        location.timezone || "Europe/Berlin"
      );

      return {
        data: {
          location,
          locationOpenStatus,
          treatmentPages,
        },
      };
    },

    async getCounts(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const activeLocale = locale || "de";

      const [loungeCount, clinicCount, doctorCount] = await Promise.all([
        strapi.documents("api::location.location").count({
          locale: activeLocale,
          filters: { type: { $eq: "lounge" } },
        }),
        strapi.documents("api::location.location").count({
          locale: activeLocale,
          filters: { type: { $eq: "clinic" } },
        }),
        strapi.documents("api::employee.employee").count({
          locale: activeLocale,
          filters: {
            isActive: { $eq: true },
            employeeType: { $eq: "doctor" },
          },
        }),
      ]);

      return {
        data: {
          loungeCount: loungeCount ?? 0,
          clinicCount: clinicCount ?? 0,
          doctorCount: doctorCount ?? 0,
        },
      };
    },
  })
);
