/**
 * location controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { getLocationStatus } from "../../../utils/locationStatus";
import {
  locationFieldsForAdsPage,
  locationFieldsForPage,
  locationPopulateForAdsPage,
  locationPopulateForPage,
} from "../../../utils/queries/locationPopulate";
import { treatmentTeaserPopulate } from "../../../utils/queries/ui";
import { mediaPopulate } from "../../../utils/queries/strapi";
import { getPreviewStatus } from "../../../utils/previewStatus";
import { locationTypeToTreatmentTypes } from "../../../utils/locationTreatmentAvailability";

export default factories.createCoreController(
  "api::location.location",
  ({ strapi }) => ({
    async findBookableLocations(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const { treatmentType } = ctx.query as { treatmentType?: string };
      const status = getPreviewStatus(ctx);

      const allowedLocationTypesForTreatment = treatmentType
        ? (Object.entries(locationTypeToTreatmentTypes)
            .filter(([, treatmentTypes]) =>
              treatmentTypes.includes(
                treatmentType as
                  | "minimally-invasive"
                  | "abulatory"
                  | "operational"
              )
            )
            .map(
              ([locationType]) =>
                locationType as "lounge" | "center" | "clinic"
            ) as ("lounge" | "center" | "clinic")[])
        : null;

      const locations = await strapi
        .documents("api::location.location")
        .findMany({
          locale,
          status,
          fields: [
            "name",
            "slug",
            "newOpeningDate",
            "timezone",
            "calendlyUrl",
            "appBookingUrl",
            "type",
            // Der Buchungsdialog der Website zeigt je Standort die Google-Note
            // und faellt bei gesperrter Buchung auf einen Kontaktweg zurueck.
            // Der Code dafuer steht dort seit 07.09.2026, blieb aber wirkungslos,
            // weil diese Antwort die Felder nicht mitgab (bfroos/myhb-store#78).
            "googlePlaceId",
            // Sperre der Redaktion: "hier nimmt gerade niemand Termine an".
            // Nicht als Filter, sondern als Feld -- ein gesperrter Standort soll
            // im Waehler sichtbar bleiben und eine Telefonnummer zeigen, statt
            // spurlos zu verschwinden (myhb-store#141: 70 Klicks in zwei Wochen
            // allein auf die MediaPark-Klinik, null Buchungen).
            "isBookingAllowed",
          ],
          filters: {
            ...(allowedLocationTypesForTreatment && {
              type: {
                $in: allowedLocationTypesForTreatment,
              },
            }),
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
            coordinates: {
              fields: ["lat", "long"],
            },
            buildingImage: mediaPopulate as object,
            // Telefon und WhatsApp fuer den Fallback ohne Online-Buchung.
            contact: {
              fields: ["phoneNumber", "whatsAppNumber"],
            },
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
    async findWithCalendlyUrl(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const locations = await strapi
        .documents("api::location.location")
        .findMany({
          locale,
          status,
          fields: [
            "name",
            "slug",
            "newOpeningDate",
            "timezone",
            "calendlyUrl",
            "appBookingUrl",
          ],
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
            coordinates: {
              fields: ["lat", "long"],
            },
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
      const status = getPreviewStatus(ctx);

      // Fetch location with all needed populate
      const location = await strapi
        .documents("api::location.location")
        .findFirst({
          locale,
          status,
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
              ...(treatmentTeaserPopulate as any),
            } as object,
          },
        });

      const treatmentPages = (treatments || [])
        .map((treatment: any) => treatment.treatmentPage)
        .filter((page: any) => page !== null && page !== undefined);

      const topCategorySlugs = Array.from(
        new Set(
          treatmentPages
            .map((page: any) =>
              Array.isArray(page?.ancestorSlugs) && page.ancestorSlugs.length > 0
                ? page.ancestorSlugs[0]
                : page?.slug
            )
            .filter((slug: unknown): slug is string => typeof slug === "string")
        )
      );

      let topCategoryNameBySlug = new Map<string, string>();

      if (topCategorySlugs.length > 0) {
        const topCategoryPages = await strapi
          .documents("api::treatment-page.treatment-page")
          .findMany({
            locale,
            status,
            fields: ["slug", "name"],
            filters: {
              slug: {
                $in: topCategorySlugs,
              },
            },
            limit: topCategorySlugs.length,
          });

        topCategoryNameBySlug = new Map(
          (topCategoryPages as any[]).map((page) => [page.slug, page.name])
        );
      }

      const treatmentPagesWithTopCategory = treatmentPages.map((page: any) => {
        const topCategorySlug =
          Array.isArray(page?.ancestorSlugs) && page.ancestorSlugs.length > 0
            ? page.ancestorSlugs[0]
            : page?.slug;

        if (!topCategorySlug) {
          return page;
        }

        return {
          ...page,
          topCategory: {
            slug: topCategorySlug,
            name: topCategoryNameBySlug.get(topCategorySlug) ?? page.name,
          },
        };
      });

      const locationOpenStatus = getLocationStatus(
        location.newOpeningDate,
        location.timezone || "Europe/Berlin"
      );

      return {
        data: {
          location,
          locationOpenStatus,
          treatmentPages: treatmentPagesWithTopCategory,
        },
      };
    },

    async findByCityAndSlugWithTreatmentsAds(ctx: Context) {
      const { citySlug, locationSlug } = ctx.params as {
        citySlug: string;
        locationSlug: string;
      };
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const location = await strapi
        .documents("api::location.location")
        .findFirst({
          locale,
          status,
          fields: locationFieldsForAdsPage as any,
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
          populate: locationPopulateForAdsPage as any,
        });

      if (!location) {
        ctx.notFound("Location not found");
        return;
      }

      const locationOpenStatus = getLocationStatus(
        location.newOpeningDate,
        location.timezone || "Europe/Berlin"
      );

      return {
        data: {
          location,
          locationOpenStatus,
        },
      };
    },

    async getCounts(ctx: Context) {
      const { locale } = ctx.query as { locale?: string };
      const activeLocale = locale || "de";
      const status = getPreviewStatus(ctx);

      const [loungeCount, clinicCount, doctorCount] = await Promise.all([
        strapi.documents("api::location.location").count({
          locale: activeLocale,
          status,
          filters: { type: { $eq: "lounge" } },
        }),
        strapi.documents("api::location.location").count({
          locale: activeLocale,
          status,
          filters: { type: { $eq: "clinic" } },
        }),
        strapi.documents("api::employee.employee").count({
          locale: activeLocale,
          status,
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
