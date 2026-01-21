import { mediaPopulate } from "./strapi";
import {
  blockTreatmentTeasersPopulate,
  editorialBlocksPopulate,
} from "./blocks";
import { seoPopulate } from "./components";

export const treatmentPagePopulateCommon = {
  localizations: {
    fields: ["locale", "pathKey"],
  },
  seo: {
    ...(seoPopulate as object),
  },
  hero: {
    populate: {
      cover: mediaPopulate as object,
    },
  },
  tableOfContents: {
    fields: ["headline", "intro", "content"],
  },
  reviews: {
    fields: ["headline"],
    populate: {
      reviews: {
        fields: ["rating", "text", "author", "source", "sourceUrl"],
      },
    },
  },
  about: {
    fields: ["headline", "intro", "content"],
    populate: {
      media: mediaPopulate as object,
    },
  },
  treatmentDetails: {
    fields: [
      "headline",
      "price",
      "duration",
      "effect",
      "initialResults",
      "finalResults",
      "effectDuration",
      "anesthesia",
      "medication",
      "aftercareSummary",
      "followUpTreatments",
    ],
    populate: {
      image: mediaPopulate as object,
    },
  },
  treatmentPlan: {
    fields: ["headline", "content", "personaAge", "personaTreatmentGoal"],
    populate: {
      additionalInfos: {
        populate: "*",
      },
      steps: {
        populate: "*",
      },
      personaPhoto: mediaPopulate as object,
    },
  },
  benefits: {
    fields: ["headline"],
    populate: {
      items: {
        populate: "*",
      },
      media: mediaPopulate as object,
    },
  },
  suitability: {
    populate: {
      suitableFor: {
        populate: "*",
      },
      notSuitableFor: {
        populate: "*",
      },
    },
  },
  medicalTeamHighlight: {
    fields: ["headline", "intro", "content"],
    populate: {
      employee: {
        populate: "*",
      },
    },
  },
  treatmentProcess: {
    fields: ["headline", "content"],
    populate: {
      steps: {
        populate: "*",
      },
    },
  },
  relatedTreatments: {
    fields: ["headline"],
    populate: {
      treatmentPages: {
        populate: {
          ...(blockTreatmentTeasersPopulate.populate.treatmentPages
            .populate as object),
        },
      },
    },
  },
  faq: {
    fields: ["headline"],
    populate: {
      faqs: {
        filters: {
          isActive: { $eq: true },
        },
        fields: ["question", "answer"],
      },
    },
  },
  treatment: {
    fields: ["priceInEuroCent", "isStartingPrice", "name"],
    populate: {
      products: {
        fields: [],
        populate: {
          variants: {
            filters: {
              isActive: { $eq: true },
            },
            fields: ["label", "slug", "isActive", "priceInEuroCent"],
          },
        },
      },
    },
  },
};

export const treatmentPagePopulateForFindByPath = {
  ...treatmentPagePopulateCommon,
  blocks: editorialBlocksPopulate,
};

export const treatmentPagePopulateForFindByLocationAndPath = {
  ...treatmentPagePopulateCommon,
};
