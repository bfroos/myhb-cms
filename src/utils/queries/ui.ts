import { mediaPopulate } from "./strapi";

export const reviewTeaserPopulate = {
  fields: ["text", "author", "rating", "source", "sourceUrl"],
  populate: {
    relatedLocation: {
      fields: ["name"],
      populate: {
        address: {
          fields: ["city"],
        },
      },
    },
  },
};

export const locationTeaserPopulate = {
  fields: ["name", "slug", "newOpeningDate", "timezone", "calendlyUrl"],
  filters: {
    city: {
      id: { $notNull: true },
    },
  },
  populate: {
    address: {
      populate: "*",
    },
    buildingImage: mediaPopulate as object,
    city: {
      fields: ["name", "slug", "federalState"],
    },
  },
};

export const treatmentTeaserPopulate = {
  fields: ["name", "slug", "ancestorSlugs", "pathKey"],
  populate: {
    treatment: {
      fields: ["priceInEuroCent", "isStartingPrice"],
    },
    teaser: {
      fields: ["title", "shortDescription", "description"],
      populate: {
        image: mediaPopulate,
      },
    },
    hero: {
      fields: [],
      populate: {
        cover: mediaPopulate,
      },
    },
  },
};
