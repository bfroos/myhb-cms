import { sharedButtonPopulate } from "./components";
import { mediaPopulate } from "./strapi";

export const blockBenefitsListPopulate = {
  populate: {
    items: {
      populate: "*",
    },
    media: mediaPopulate,
    links: sharedButtonPopulate as object,
    cardSettings: {
      populate: "*",
    },
    videoSettings: {
      populate: "*",
    },
  },
};

export const blockComparisonBlockPopulate = {
  populate: {
    firstItem: {
      populate: "*",
    },
    secondItem: {
      populate: "*",
    },
    cardSettings: {
      populate: "*",
    },
  },
};

export const blockDirectionsPopulate = {
  populate: {
    image: mediaPopulate,
    cardSettings: {
      populate: "*",
    },
  },
};

export const blockEmployeePopulate = {
  populate: {
    employee: {
      populate: {
        photo: mediaPopulate,
      },
    },
    cardSettings: {
      populate: "*",
    },
    links: {
      populate: "*",
    },
  },
};

export const blockEmployeeListPopulate = {
  populate: {
    employees: {
      filters: {
        hideFromPublic: {
          $eq: false,
        },
        isActive: {
          $eq: true,
        },
      },
      fields: [
        "firstName",
        "lastName",
        "academicTitle",
        "role",
        "department",
        "employeeType",
        "slug",
      ],
      populate: {
        photo: mediaPopulate,
      },
    },
    cardSettings: {
      populate: "*",
    },
  },
};

export const blockFaqBlockPopulate = {
  populate: {
    faqs: {
      fields: ["question", "answer", "isActive"],
    },
    faqSets: {
      populate: {
        faqs: {
          fields: ["question", "answer", "isActive"],
        },
      },
    },
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockHighlightsStripPopulate = {
  populate: {
    iconItems: {
      populate: "*",
    },
    numberItems: {
      populate: "*",
    },
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockLocationMapPopulate = {
  populate: {
    list: {
      populate: "*",
    },
    links: sharedButtonPopulate as object,
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockMediaBentoPopulate = {
  populate: {
    mediaItems: mediaPopulate,
    links: {
      populate: "*",
    },
    cardSettings: {
      populate: "*",
    },
    videoSettings: {
      populate: "*",
    },
  },
} as const;

export const mediaCardPopulate = {
  populate: {
    media: mediaPopulate,
    cardSettings: {
      populate: "*",
    },
    videoSettings: {
      populate: "*",
    },
    links: {
      populate: "*",
    },
  },
};

export const blockMyClubPopulate = {
  populate: {
    clubBenefits: {
      populate: "*",
    },
    clubCardSettings: {
      populate: "*",
    },
    grouponCardSettings: {
      populate: "*",
    },
    grouponImage: mediaPopulate,
  },
} as const;

export const blockPageHeaderPopulate = {
  populate: {
    media: mediaPopulate,
    cardSettings: {
      populate: "*",
    },
    videoSettings: {
      populate: "*",
    },
  },
} as const;

export const blockProcessStepsPopulate = {
  populate: {
    steps: {
      populate: {
        image: mediaPopulate,
      },
    },
    links: sharedButtonPopulate as object,
  },
} as const;

export const blockProductCategoryPriceOverviewPopulate = {
  populate: {
    productCategories: {
      fields: ["name", "slug"],
      populate: {
        products: {
          fields: ["name", "slug"],
          populate: {
            variants: {
              fields: ["label", "slug", "isActive", "priceInEuroCent"], // TODO: Filter isActive
              populate: {
                volume: {
                  fields: ["quantity", "unit"],
                },
              },
            },
            manufacturer: {
              fields: ["name"],
              populate: {
                logo: mediaPopulate,
              },
            },
          },
        },
        treatments: {
          fields: ["name", "priceInEuroCent", "isStartingPrice"],
          populate: {
            treatmentPage: {
              fields: ["name", "pathKey"],
            },
          },
        },
      },
    },
  },
} as const;

export const blockPriceOverviewPopulate = {
  populate: {
    cta: sharedButtonPopulate as object,
    treatments: {
      fields: ["name", "priceInEuroCent", "isStartingPrice"],
      populate: {
        treatmentPage: {
          fields: ["name", "pathKey"],
        },
      },
    },
    product_categories: {
      fields: ["name", "slug"],
      populate: {
        products: {
          fields: ["name", "slug"],
          populate: {
            variants: {
              fields: ["label", "slug", "isActive", "priceInEuroCent"],
              populate: {
                volume: {
                  fields: ["quantity", "unit"],
                },
              },
            },
            manufacturer: {
              fields: ["name"],
              populate: {
                logo: mediaPopulate,
              },
            },
          },
        },
        treatments: {
          fields: ["name", "priceInEuroCent", "isStartingPrice"],
          populate: {
            treatmentPage: {
              fields: ["name", "pathKey"],
            },
          },
        },
      },
    },
  },
} as const;

export const blockPriceTeaserPopulate = {
  populate: {
    treatments: {
      fields: ["name", "priceInEuroCent", "isStartingPrice"],
      populate: {
        treatmentPage: {
          fields: ["name", "pathKey"],
        },
      },
    },
    cta: sharedButtonPopulate as object,
  },
} as const;

export const blockReviewsPopulate = {
  populate: {
    reviews: {
      fields: ["rating", "text", "author", "source", "sourceUrl"],
      populate: {
        location: {
          fields: ["name"],
          populate: {
            city: {
              fields: ["name"],
            },
            address: {
              fields: ["street", "houseNumber", "postalCode", "city"],
            },
          },
        },
      },
    },
  },
} as const;

export const blockStoriesPopulate = {
  populate: {
    stories: {
      fields: ["title", "subtitle"],
      populate: {
        video: mediaPopulate,
      },
    },
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockTableOfContentsPopulate = {
  populate: {
    index: {
      populate: "*",
    },
    links: sharedButtonPopulate as object,
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockTextContentPopulate = {
  populate: {
    cardSettings: {
      populate: "*",
    },
    links: sharedButtonPopulate as object,
  },
} as const;

export const blockTreatmentDetailsPopulate = {
  populate: {
    image: mediaPopulate,
    treatment: {
      fields: ["priceInEuroCent", "isStartingPrice", "name"],
    },
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockTreatmentHeroPopulate = {
  populate: {
    cover: mediaPopulate,
    cardSettings: {
      populate: "*",
    },
    cta: {
      populate: "*",
    },
    treatment: {
      fields: ["priceInEuroCent", "isStartingPrice", "name"],
    },
  },
} as const;

export const blockTreatmentPlanPopulate = {
  populate: {
    additionalInfos: {
      populate: "*",
    },
    personaPhoto: mediaPopulate,
    steps: {
      populate: {
        treatments: {
          fields: ["label"],
          populate: {
            treatmentPage: {
              fields: ["pathKey"],
            },
          },
        },
      },
    },
    links: sharedButtonPopulate as object,
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockTreatmentTeasersPopulate = {
  populate: {
    treatmentPages: {
      fields: ["name", "pathKey"],
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
          populate: {
            cover: mediaPopulate,
          },
        },
      },
    },
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockTrustGridPopulate = {
  populate: {
    items: {
      populate: "*",
    },
    cardSettings: {
      populate: "*",
    },
  },
} as const;

export const blockTrustBarPopulate = {
  populate: {
    items: {
      populate: "*",
    },
  },
} as const;

export const blockBenefitGridPopulate = {
  populate: {
    items: {
      populate: "*",
    },
  },
} as const;

export const blockGuaranteesPopulate = {
  populate: {
    items: {
      populate: "*",
    },
  },
} as const;

export const blockQuickInfoPopulate = {
  populate: {
    items: {
      populate: "*",
    },
  },
} as const;

export const blockSeoCollapsiblePopulate = {
  populate: {
    items: {
      populate: "*",
    },
  },
} as const;

export const blockFinalCtaPopulate = {
  populate: {
    primaryCta: sharedButtonPopulate as object,
    secondaryCta: sharedButtonPopulate as object,
  },
} as const;

export const blockAwardsPopulate = {
  populate: {
    items: {
      populate: "*",
    },
  },
} as const;

export const landingBlockPopulate = {
  populate: {},
} as const;

export const blockLandingHeroPopulate = {
  populate: {
    imageMedia: mediaPopulate,
  },
} as const;

export const blockBeforeAfterPopulate = {
  populate: {
    pairsMedia: {
      populate: {
        beforeImage: mediaPopulate,
        afterImage: mediaPopulate,
      },
    },
  },
} as const;

export const blockDoctorLandingPopulate = {
  populate: {
    imageMedia: mediaPopulate,
  },
} as const;

export const blockPressLogosPopulate = {
  populate: {
    logoItems: {
      populate: {
        logo: mediaPopulate,
      },
    },
  },
} as const;

export const blockPromoBannerPopulate = {
  populate: {
    stickerMedia: mediaPopulate,
  },
} as const;

export const blockPromoStripPopulate = {
  populate: {
    stickerMedia: mediaPopulate,
  },
} as const;

export const blockPromoHeroPopulate = {
  populate: {
    imageMedia: mediaPopulate,
    stickerMedia: mediaPopulate,
  },
} as const;

export const blockPromoFloatingStickerPopulate = {
  populate: {
    stickerMedia: mediaPopulate,
  },
} as const;

export const allBlocksPopulate = {
  on: {
    "blocks.benefits-list": blockBenefitsListPopulate,
    "blocks.comparison-block": blockComparisonBlockPopulate,
    "blocks.directions": blockDirectionsPopulate,
    "blocks.employee": blockEmployeePopulate,
    "blocks.employee-list": blockEmployeeListPopulate,
    "blocks.faq": blockFaqBlockPopulate,
    "blocks.highlights-strip": blockHighlightsStripPopulate,
    "blocks.location-map": blockLocationMapPopulate,
    "blocks.media-bento": blockMediaBentoPopulate,
    "blocks.media-card": mediaCardPopulate,
    "blocks.my-club": blockMyClubPopulate,
    "blocks.page-header": blockPageHeaderPopulate,
    "blocks.process-steps": blockProcessStepsPopulate,
    "blocks.product-category-price-overview":
      blockProductCategoryPriceOverviewPopulate,
    "blocks.reviews": blockReviewsPopulate,
    "blocks.stories": blockStoriesPopulate,
    "blocks.table-of-contents": blockTableOfContentsPopulate,
    "blocks.text-content": blockTextContentPopulate,
    "blocks.treatment-details": blockTreatmentDetailsPopulate,
    "blocks.treatment-hero": blockTreatmentHeroPopulate,
    "blocks.treatment-plan": blockTreatmentPlanPopulate,
    "blocks.treatment-teasers": blockTreatmentTeasersPopulate,
    "blocks.trust-grid": blockTrustGridPopulate,
    "blocks.landing-hero": blockLandingHeroPopulate,
    "blocks.trust-bar": blockTrustBarPopulate,
    "blocks.quick-info": blockQuickInfoPopulate,
    "blocks.before-after": blockBeforeAfterPopulate,
    "blocks.benefit-grid": blockBenefitGridPopulate,
    "blocks.seo-collapsible": blockSeoCollapsiblePopulate,
    "blocks.doctor": blockDoctorLandingPopulate,
    "blocks.price-overview": blockPriceOverviewPopulate,
    "blocks.price-teaser": blockPriceTeaserPopulate,
    "blocks.faq-accordion": landingBlockPopulate,
    "blocks.local-section": landingBlockPopulate,
    "blocks.location-card": landingBlockPopulate,
    "blocks.final-cta": blockFinalCtaPopulate,
    "blocks.mobile-sticky-cta": landingBlockPopulate,
    "blocks.landing-reviews": landingBlockPopulate,
    "blocks.press-logos": blockPressLogosPopulate,
    "blocks.guarantees": blockGuaranteesPopulate,
    "blocks.awards": blockAwardsPopulate,
    "blocks.live-counter": landingBlockPopulate,
    "blocks.promo-banner": blockPromoBannerPopulate,
    "blocks.promo-strip": blockPromoStripPopulate,
    "blocks.promo-hero": blockPromoHeroPopulate,
    "blocks.promo-floating-sticker": blockPromoFloatingStickerPopulate,
  },
};

export const locationsPageBlocksPopulate = {
  on: {
    "blocks.directions": blockDirectionsPopulate,
    "blocks.benefits-list": blockBenefitsListPopulate,
    "blocks.comparison-block": blockComparisonBlockPopulate,
    "blocks.employee": blockEmployeePopulate,
    "blocks.faq": blockFaqBlockPopulate,
    "blocks.highlights-strip": blockHighlightsStripPopulate,
    "blocks.media-bento": blockMediaBentoPopulate,
    "blocks.media-card": mediaCardPopulate,
    "blocks.my-club": blockMyClubPopulate,
    "blocks.process-steps": blockProcessStepsPopulate,
    "blocks.text-content": blockTextContentPopulate,
    "blocks.trust-grid": blockTrustGridPopulate,
  },
};

export const generalPageBlocksPopulate = {
  on: {
    "blocks.benefits-list": blockBenefitsListPopulate,
    "blocks.comparison-block": blockComparisonBlockPopulate,
    "blocks.employee": blockEmployeePopulate,
    "blocks.employee-list": blockEmployeeListPopulate,
    "blocks.faq": blockFaqBlockPopulate,
    "blocks.highlights-strip": blockHighlightsStripPopulate,
    "blocks.location-map": blockLocationMapPopulate,
    "blocks.media-bento": blockMediaBentoPopulate,
    "blocks.media-card": mediaCardPopulate,
    "blocks.page-header": blockPageHeaderPopulate,
    "blocks.process-steps": blockProcessStepsPopulate,
    "blocks.product-category-price-overview":
      blockProductCategoryPriceOverviewPopulate,
    "blocks.reviews": blockReviewsPopulate,
    "blocks.stories": blockStoriesPopulate,
    "blocks.text-content": blockTextContentPopulate,
    "blocks.treatment-hero": blockTreatmentHeroPopulate,
    "blocks.treatment-plan": blockTreatmentPlanPopulate,
    "blocks.treatment-teasers": blockTreatmentTeasersPopulate,
    "blocks.trust-grid": blockTrustGridPopulate,
    "blocks.my-club": blockMyClubPopulate,
  },
};

export const customPageBlocksPopulate = {
  on: {
    "blocks.page-header": blockPageHeaderPopulate,
  },
};

export const headerPageBlocksPopulate = {
  on: {
    "blocks.page-header": blockPageHeaderPopulate,
    "blocks.treatment-hero": blockTreatmentHeroPopulate,
  },
};

export const editorialBlocksPopulate = {
  on: {
    "blocks.benefits-list": blockBenefitsListPopulate,
    "blocks.comparison-block": blockComparisonBlockPopulate,
    "blocks.employee": blockEmployeePopulate,
    "blocks.faq": blockFaqBlockPopulate,
    "blocks.highlights-strip": blockHighlightsStripPopulate,
    "blocks.media-bento": blockMediaBentoPopulate,
    "blocks.media-card": mediaCardPopulate,
    "blocks.my-club": blockMyClubPopulate,
    "blocks.process-steps": blockProcessStepsPopulate,
    "blocks.text-content": blockTextContentPopulate,
    "blocks.trust-grid": blockTrustGridPopulate,
    "blocks.location-map": blockLocationMapPopulate,
  },
};

export const doctorsBlocksPopulate = {
  on: {
    "blocks.employee-list": blockEmployeeListPopulate,
  },
};

export const homepageBlocksPopulate = {
  on: {
    "blocks.treatment-hero": blockTreatmentHeroPopulate,
    "blocks.page-header": blockPageHeaderPopulate,
    "blocks.benefits-list": blockBenefitsListPopulate,
    "blocks.comparison-block": blockComparisonBlockPopulate,
    "blocks.employee": blockEmployeePopulate,
    "blocks.employee-list": blockEmployeeListPopulate,
    "blocks.faq": blockFaqBlockPopulate,
    "blocks.highlights-strip": blockHighlightsStripPopulate,
    "blocks.location-map": blockLocationMapPopulate,
    "blocks.media-bento": blockMediaBentoPopulate,
    "blocks.media-card": mediaCardPopulate,
    "blocks.my-club": blockMyClubPopulate,
    "blocks.process-steps": blockProcessStepsPopulate,
    "blocks.product-category-price-overview":
      blockProductCategoryPriceOverviewPopulate,
    "blocks.reviews": blockReviewsPopulate,
    "blocks.stories": blockStoriesPopulate,
    "blocks.text-content": blockTextContentPopulate,
    "blocks.treatment-teasers": blockTreatmentTeasersPopulate,
    "blocks.trust-grid": blockTrustGridPopulate,
  },
};
