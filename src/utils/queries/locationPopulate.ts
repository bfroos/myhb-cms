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
  about: {
    populate: {
      comingSoon: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: mediaPopulate as object,
        },
      },
      openSoon: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: mediaPopulate as object,
        },
      },
      open: {
        fields: ["headline", "intro", "content"],
        populate: {
          media: mediaPopulate as object,
        },
      },
    },
  },
};
