import { mediaPopulate } from "./strapi";

export const locationFieldsForPage = [
  "name",
  "slug",
  "newOpeningDate",
  "timezone",
  "googlePlaceId",
  "description",
  "isBookingAllowed",
  "showDiscount",
  "type",
  "calendlyUrl",
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
      image: {
        fields: ["url", "formats"],
      },
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
  about: {
    populate: {
      comingSoon: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: {
            fields: ["mime", "url", "formats"],
          },
        },
      },
      openSoon: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: {
            fields: ["mime", "url", "formats"],
          },
        },
      },
      open: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: {
            fields: ["mime", "url", "formats"],
          },
        },
      },
    },
  },
};
