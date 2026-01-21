import { mediaLightPopulate } from "./strapi";

export const sharedAddressPopulate = {
  fields: ["street", "houseNumber", "postalCode", "city"],
};

export const seoPopulate = {
  populate: {
    openGraph: {
      populate: {
        ogImage: mediaLightPopulate as object,
      },
    },
  },
};

export const sharedButtonPopulate = {
  populate: {
    page: {
      fields: ["slug"],
    },
    treatment: {
      fields: ["pathKey"],
    },
    location: {
      fields: ["slug"],
      populate: {
        city: {
          fields: ["slug"],
        },
      },
    },
    product: {
      fields: ["slug"],
      populate: {
        category: {
          fields: ["slug"],
        },
      },
    },
  },
};
