import { mediaPopulate } from "./strapi";
import { allBlocksPopulate, blockTreatmentTeasersPopulate } from "./blocks";
import { seoPopulate } from "./components";

function buildTreatmentPlanPopulate(
  relationKey: "treatmentPage" | "treatmentAdsPage",
) {
  return {
    fields: ["headline", "content", "personaAge", "personaTreatmentGoal"],
    populate: {
      additionalInfos: {
        populate: "*",
      },
      personaPhoto: mediaPopulate as object,
      steps: {
        populate: {
          treatments: {
            fields: ["label"],
            populate: {
              [relationKey]: {
                fields: ["pathKey"],
              },
            },
          },
        },
      },
    },
  };
}

function buildRelatedTreatmentsPopulate(
  relationKey: "treatmentPages" | "treatmentAdsPages",
) {
  return {
    fields: ["headline"],
    populate: {
      [relationKey]: {
        populate: {
          ...(blockTreatmentTeasersPopulate.populate.treatmentPages
            .populate as object),
        },
      },
    },
  };
}

const treatmentPagePopulateBase = {
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
  faq: {
    fields: ["headline"],
    populate: {
      faqs: {
        filters: {
          isActive: { $eq: true },
        },
        fields: ["question", "answer"],
      },
      faqSets: {
        populate: {
          faqs: {
            fields: ["question", "answer"],
            filters: {
              isActive: { $eq: true },
            },
          },
        },
      },
    },
  },
  treatment: {
    fields: ["priceInEuroCent", "isStartingPrice", "name", "type"],
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

export const treatmentPagePopulateCommon = {
  ...treatmentPagePopulateBase,
  treatmentPlan: buildTreatmentPlanPopulate("treatmentPage"),
  relatedTreatments: buildRelatedTreatmentsPopulate("treatmentPages"),
};

const treatmentAdsPopulateOverrides = {
  treatmentPlan: buildTreatmentPlanPopulate("treatmentAdsPage"),
  relatedTreatments: buildRelatedTreatmentsPopulate("treatmentAdsPages"),
};

export const treatmentAdsPagePopulateCommon = {
  ...treatmentPagePopulateCommon,
  ...treatmentAdsPopulateOverrides,
};

export const treatmentPagePopulateForFindByPath = {
  ...treatmentPagePopulateCommon,
  blocks: allBlocksPopulate as object,
};

export const treatmentPagePopulateForFindByLocationAndPath = {
  ...treatmentPagePopulateCommon,
};

export const treatmentAdsPagePopulateForFindByPath = {
  ...treatmentAdsPagePopulateCommon,
  blocks: allBlocksPopulate as object,
};

export const treatmentAdsPagePopulateForFindByLocationAndPath = {
  ...treatmentAdsPagePopulateCommon,
};
