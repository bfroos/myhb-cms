import { mediaPopulate, mediaWithDatePopulate } from "./strapi";

export const locationFieldsForPage = [
  "name",
  "slug",
  "newOpeningDate",
  "timezone",
  "googlePlaceId",
  "description",
  "isBookingAllowed",
  "showDiscount",
  // Standortseite zusaetzlich auf Franzoesisch (/fr/lieux/...), sonst nur
  // Deutsch (TSEO-01). Erst Saarbruecken, Benjamin 16.10.2026.
  "showFrenchPage",
  "type",
  "calendlyUrl",
  "appBookingUrl",
];

export const locationFieldsForAdsPage = [
  "name",
  "slug",
  "newOpeningDate",
  "timezone",
  "googlePlaceId",
  "isBookingAllowed",
  "showDiscount",
  "type",
  "calendlyUrl",
  "appBookingUrl",
];

export const locationPopulateForPage = {
  localizations: {
    fields: ["locale", "slug"],
  },
  address: {
    fields: ["street", "houseNumber", "postalCode", "city"],
  },
  directions: {
    fields: [
      "headline",
      "content",
      "walkDirections",
      "publicTransportDirections",
      "carDirections",
    ],
    populate: {
      image: mediaPopulate as object,
    },
  },
  coordinates: {
    fields: ["lat", "long"],
  },
  buildingImage: mediaPopulate as object,
  city: {
    fields: ["name", "slug", "federalState"],
    populate: {
      localizations: {
        fields: ["locale", "slug"],
      },
    },
  },
  reviews: {
    fields: ["rating", "text", "author", "source", "sourceUrl"],
  },
  contact: {
    fields: ["phoneNumber", "whatsAppNumber"],
  },
  openingHours: {
    populate: {
      week: {
        populate: {
          intervals: {
            populate: "*",
          },
        },
      },
      exceptions: {
        populate: {
          intervals: {
            populate: "*",
          },
        },
      },
    },
  },
  // Belegte Standort-Fakten fuer Stadtseiten (E24, bfroos/myhb-store#312)
  localFacts: {
    populate: {
      localFaqSet: {
        fields: ["internalLabel"],
        populate: { faqs: { fields: ["question", "answer"] } },
      },
    },
  },
  about: {
    populate: {
      comingSoon: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: mediaWithDatePopulate as object,
          poster: mediaPopulate as object,
        },
      },
      openSoon: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: mediaWithDatePopulate as object,
          poster: mediaPopulate as object,
        },
      },
      open: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: mediaWithDatePopulate as object,
          poster: mediaPopulate as object,
        },
      },
    },
  },
  jobs: {
    filters: { isActive: { $eq: true } },
    fields: [
      "title",
      "slug",
      "genderHint",
      "employmentTypes",
      "hourlyRateMinInEuroCent",
      "hourlyRateMaxInEuroCent",
    ],
    populate: {
      localizations: { fields: ["locale", "slug"] },
      locations: {
        fields: ["name"],
        populate: { city: { fields: ["name"] } },
      },
    },
  },
};

export const locationPopulateForAdsPage = {
  localizations: {
    fields: ["locale", "slug"],
  },
  address: {
    fields: ["street", "houseNumber", "postalCode", "city"],
  },
  directions: {
    fields: [
      "headline",
      "content",
      "walkDirections",
      "publicTransportDirections",
      "carDirections",
    ],
    populate: {
      image: mediaPopulate as object,
    },
  },
  coordinates: {
    fields: ["lat", "long"],
  },
  buildingImage: mediaPopulate as object,
  city: {
    fields: ["name", "slug", "federalState"],
    populate: {
      localizations: {
        fields: ["locale", "slug"],
      },
    },
  },
  contact: {
    fields: ["phoneNumber", "whatsAppNumber"],
  },
  openingHours: {
    populate: {
      week: {
        populate: {
          intervals: {
            populate: "*",
          },
        },
      },
      exceptions: {
        populate: {
          intervals: {
            populate: "*",
          },
        },
      },
    },
  },
};
