import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksBenefitsList extends Struct.ComponentSchema {
  collectionName: 'components_blocks_benefits_lists';
  info: {
    displayName: 'Benefits List';
    icon: 'check';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.icon-heading-content', true>;
    links: Schema.Attribute.Component<'shared.button', true>;
    media: Schema.Attribute.Media<'images' | 'videos'>;
    videoSettings: Schema.Attribute.Component<'shared.video-settings', false>;
  };
}

export interface BlocksComparisonBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_comparison_blocks';
  info: {
    displayName: 'Comparison';
    icon: 'emotionHappy';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    firstItem: Schema.Attribute.Component<'shared.icon-heading-content', false>;
    secondItem: Schema.Attribute.Component<
      'shared.icon-heading-content',
      false
    >;
  };
}

export interface BlocksDirections extends Struct.ComponentSchema {
  collectionName: 'components_blocks_directions';
  info: {
    displayName: 'Directions';
    icon: 'train';
  };
  attributes: {
    carDirections: Schema.Attribute.Text;
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    fixedImageAspectRatio: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    headline: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    publicTransportDirections: Schema.Attribute.Text;
    walkDirections: Schema.Attribute.Text;
  };
}

export interface BlocksEmployee extends Struct.ComponentSchema {
  collectionName: 'components_blocks_employees';
  info: {
    displayName: 'Employee';
    icon: 'user';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    employee: Schema.Attribute.Relation<'oneToOne', 'api::employee.employee'>;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    layout: Schema.Attribute.Enumeration<['media-left', 'media-right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'media-left'>;
    links: Schema.Attribute.Component<'shared.button', true>;
  };
}

export interface BlocksEmployeeList extends Struct.ComponentSchema {
  collectionName: 'components_blocks_employee_lists';
  info: {
    displayName: 'Employee List';
    icon: 'user';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    employees: Schema.Attribute.Relation<'oneToMany', 'api::employee.employee'>;
    headline: Schema.Attribute.String;
  };
}

export interface BlocksFaq extends Struct.ComponentSchema {
  collectionName: 'components_blocks_faqs';
  info: {
    displayName: 'FAQ';
    icon: 'question';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    faqs: Schema.Attribute.Relation<'oneToMany', 'api::faq.faq'>;
    faqSets: Schema.Attribute.Relation<'oneToMany', 'api::faq-set.faq-set'>;
    headline: Schema.Attribute.String;
  };
}

export interface BlocksHighlightsStrip extends Struct.ComponentSchema {
  collectionName: 'components_blocks_highlights_strips';
  info: {
    displayName: 'Highlights Strip';
    icon: 'thumbUp';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
    iconItems: Schema.Attribute.Component<'shared.icon-text-pair', true>;
    numberItems: Schema.Attribute.Component<'shared.key-value', true>;
    showDivider: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    type: Schema.Attribute.Enumeration<['numbers', 'icons']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'numbers'>;
  };
}

export interface BlocksLocationMap extends Struct.ComponentSchema {
  collectionName: 'components_blocks_location_maps';
  info: {
    displayName: 'Location Map';
    icon: 'globe';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
    links: Schema.Attribute.Component<'shared.button', true>;
    list: Schema.Attribute.Component<'shared.icon-text-pair', true>;
  };
}

export interface BlocksMediaBento extends Struct.ComponentSchema {
  collectionName: 'components_blocks_media_bentos';
  info: {
    displayName: 'Media Bento';
    icon: 'dashboard';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    layout: Schema.Attribute.Enumeration<['media-left', 'media-right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'media-left'>;
    links: Schema.Attribute.Component<'shared.button', true>;
    mediaItems: Schema.Attribute.Media<'images' | 'videos', true>;
    videoSettings: Schema.Attribute.Component<'shared.video-settings', false>;
  };
}

export interface BlocksMediaCard extends Struct.ComponentSchema {
  collectionName: 'components_blocks_media_cards';
  info: {
    displayName: 'Media Card';
    icon: 'landscape';
  };
  attributes: {
    captionDescription: Schema.Attribute.String;
    captionTitle: Schema.Attribute.String;
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    contentAlignment: Schema.Attribute.Enumeration<
      ['top', 'center', 'bottom']
    > &
      Schema.Attribute.DefaultTo<'top'>;
    fixedImageAspectRatio: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    layout: Schema.Attribute.Enumeration<['media-left', 'media-right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'media-left'>;
    links: Schema.Attribute.Component<'shared.button', true>;
    media: Schema.Attribute.Media<'images' | 'videos'>;
    mediaAlignment: Schema.Attribute.Enumeration<['top', 'center', 'bottom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'top'>;
    mediaCaption: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    videoSettings: Schema.Attribute.Component<'shared.video-settings', false>;
  };
}

export interface BlocksPageHeader extends Struct.ComponentSchema {
  collectionName: 'components_blocks_page_headers';
  info: {
    displayName: 'Page Header';
    icon: 'crown';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    fixedImageAspectRatio: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    layout: Schema.Attribute.Enumeration<['split', 'compact']>;
    media: Schema.Attribute.Media<'images' | 'videos'>;
    videoSettings: Schema.Attribute.Component<'shared.video-settings', false>;
  };
}

export interface BlocksProcessSteps extends Struct.ComponentSchema {
  collectionName: 'components_blocks_process_steps';
  info: {
    displayName: 'Process Steps';
    icon: 'bulletList';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    links: Schema.Attribute.Component<'shared.button', true>;
    steps: Schema.Attribute.Component<'shared.image-heading-text', true>;
  };
}

export interface BlocksProductCategoryPriceOverview
  extends Struct.ComponentSchema {
  collectionName: 'components_blocks_product_category_price_overviews';
  info: {
    displayName: 'Product Category Price Overview';
    icon: 'priceTag';
  };
  attributes: {
    productCategories: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-category.product-category'
    >;
    showProducts: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    showTreatments: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksReviews extends Struct.ComponentSchema {
  collectionName: 'components_blocks_reviews';
  info: {
    displayName: 'Reviews';
    icon: 'star';
  };
  attributes: {
    evenItemsTheme: Schema.Attribute.Enumeration<
      ['light', 'soft', 'neutral', 'strong']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'soft'>;
    googlePlaceId: Schema.Attribute.String;
    headline: Schema.Attribute.String;
    localReviews: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    oddItemsTheme: Schema.Attribute.Enumeration<
      ['light', 'soft', 'neutral', 'strong']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'neutral'>;
    reviews: Schema.Attribute.Relation<'oneToMany', 'api::review.review'>;
  };
}

export interface BlocksStories extends Struct.ComponentSchema {
  collectionName: 'components_blocks_stories';
  info: {
    displayName: 'Stories';
    icon: 'television';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
    stories: Schema.Attribute.Relation<'oneToMany', 'api::story.story'>;
  };
}

export interface BlocksTableOfContents extends Struct.ComponentSchema {
  collectionName: 'components_blocks_table_of_contents';
  info: {
    displayName: 'Table Of Contents';
    icon: 'stack';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    index: Schema.Attribute.Component<'shared.key-value', true>;
    intro: Schema.Attribute.Text;
    links: Schema.Attribute.Component<'shared.button', true>;
  };
}

export interface BlocksTextContent extends Struct.ComponentSchema {
  collectionName: 'components_blocks_text_contents';
  info: {
    displayName: 'Text Content';
    icon: 'bold';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    columnCount: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    links: Schema.Attribute.Component<'shared.button', true>;
  };
}

export interface BlocksTreatmentDetails extends Struct.ComponentSchema {
  collectionName: 'components_blocks_treatment_details';
  info: {
    displayName: 'Treatment Details';
    icon: 'doctor';
  };
  attributes: {
    aftercareSummary: Schema.Attribute.Text;
    anesthesia: Schema.Attribute.Text;
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    duration: Schema.Attribute.Text;
    effect: Schema.Attribute.Text;
    effectDuration: Schema.Attribute.Text;
    finalResults: Schema.Attribute.Text;
    followUpTreatments: Schema.Attribute.Text;
    headline: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    initialResults: Schema.Attribute.Text;
    medication: Schema.Attribute.Text;
    price: Schema.Attribute.Text;
    treatment: Schema.Attribute.Relation<
      'oneToOne',
      'api::treatment.treatment'
    >;
  };
}

export interface BlocksTreatmentHero extends Struct.ComponentSchema {
  collectionName: 'components_blocks_treatment_heroes';
  info: {
    displayName: 'Treatment Hero';
    icon: 'crown';
  };
  attributes: {
    announcementText: Schema.Attribute.String;
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    cover: Schema.Attribute.Media<'images'>;
    cta: Schema.Attribute.Component<'shared.button', false>;
    eyebrow: Schema.Attribute.String;
    headline: Schema.Attribute.String;
    headlinePrefix: Schema.Attribute.String;
    headlineSuffix: Schema.Attribute.String;
    showCompanyLogos: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    showGlobalDiscount: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    showPrice: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    showReviews: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    subline: Schema.Attribute.String;
    text: Schema.Attribute.Text;
    treatment: Schema.Attribute.Relation<
      'oneToOne',
      'api::treatment.treatment'
    >;
  };
}

export interface BlocksTreatmentPlan extends Struct.ComponentSchema {
  collectionName: 'components_blocks_treatment_plans';
  info: {
    displayName: 'Treatment Plan';
    icon: 'file';
  };
  attributes: {
    additionalInfos: Schema.Attribute.Component<
      'shared.collabsible-item',
      true
    >;
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    links: Schema.Attribute.Component<'shared.button', true>;
    personaAge: Schema.Attribute.Integer;
    personaPhoto: Schema.Attribute.Media<'images'>;
    personaTreatmentGoal: Schema.Attribute.String;
    steps: Schema.Attribute.Component<
      'treatment-plan.treatment-plan-step',
      true
    >;
  };
}

export interface BlocksTreatmentTeasers extends Struct.ComponentSchema {
  collectionName: 'components_blocks_treatment_teasers';
  info: {
    displayName: 'Treatment Teasers';
    icon: 'store';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
    showDescriptions: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    showPrices: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    showShortDescriptions: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    treatmentPages: Schema.Attribute.Relation<
      'oneToMany',
      'api::treatment-page.treatment-page'
    >;
  };
}

export interface BlocksTrustGrid extends Struct.ComponentSchema {
  collectionName: 'components_blocks_trust_grids';
  info: {
    displayName: 'Trust Grid';
    icon: 'apps';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
    iconPosition: Schema.Attribute.Enumeration<['aside', 'above']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'above'>;
    items: Schema.Attribute.Component<'shared.icon-heading-content', true>;
    itemsPosition: Schema.Attribute.Enumeration<['aside', 'below']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'aside'>;
  };
}

export interface BlogCallToAction extends Struct.ComponentSchema {
  collectionName: 'components_blog_call_to_actions';
  info: {
    displayName: 'Call to action';
  };
  attributes: {
    headline: Schema.Attribute.String;
  };
}

export interface BlogCallout extends Struct.ComponentSchema {
  collectionName: 'components_blog_callouts';
  info: {
    displayName: 'Callout';
  };
  attributes: {
    headline: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface BlogCta extends Struct.ComponentSchema {
  collectionName: 'components_blog_ctas';
  info: {
    displayName: 'Cta';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.button', false>;
    headline: Schema.Attribute.String;
  };
}

export interface BlogImage extends Struct.ComponentSchema {
  collectionName: 'components_blog_images';
  info: {
    displayName: 'Image';
  };
  attributes: {
    fixedImageAspectRatio: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images' | 'videos'>;
    imageJustify: Schema.Attribute.Enumeration<['left', 'center', 'right']> &
      Schema.Attribute.DefaultTo<'center'>;
  };
}

export interface BlogNewsletter extends Struct.ComponentSchema {
  collectionName: 'components_blog_newsletters';
  info: {
    displayName: 'Newsletter';
  };
  attributes: {
    headline: Schema.Attribute.String;
  };
}

export interface BlogText extends Struct.ComponentSchema {
  collectionName: 'components_blog_texts';
  info: {
    displayName: 'Text';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
  };
}

export interface CareerPageJobTeasers extends Struct.ComponentSchema {
  collectionName: 'components_career_page_job_teasers';
  info: {
    displayName: 'Job Teasers';
  };
  attributes: {
    cardSettings: Schema.Attribute.Component<'shared.card-design', false>;
    headline: Schema.Attribute.String;
  };
}

export interface EmployeeQualificationGroup extends Struct.ComponentSchema {
  collectionName: 'components_employee_qualification_groups';
  info: {
    description: 'Gruppe von Qualifikationen (z.B. Sprachen, Spezialgebiete).';
    displayName: 'Qualification Group';
  };
  attributes: {
    items: Schema.Attribute.Component<'employee.text-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface EmployeeTextItem extends Struct.ComponentSchema {
  collectionName: 'components_employee_text_items';
  info: {
    description: 'Ein einzelner Texteintag (z.B. Sprache oder Spezialgebiet).';
    displayName: 'Text Item';
  };
  attributes: {
    text: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface EmployeeVitaEntry extends Struct.ComponentSchema {
  collectionName: 'components_employee_vita_entries';
  info: {
    description: 'Ein Eintrag im Werdegang (Jahresbereich + Text).';
    displayName: 'Vita Entry';
  };
  attributes: {
    fromYear: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.SetMinMax<
        {
          min: 1900;
        },
        number
      >;
    text: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    toYear: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.SetMinMax<
        {
          min: 1900;
        },
        number
      >;
  };
}

export interface GlobalBrand extends Struct.ComponentSchema {
  collectionName: 'components_global_brands';
  info: {
    displayName: 'Brand';
  };
  attributes: {
    name: Schema.Attribute.String;
    nameShort: Schema.Attribute.String;
  };
}

export interface GlobalMarketing extends Struct.ComponentSchema {
  collectionName: 'components_global_marketings';
  info: {
    displayName: 'Marketing';
  };
  attributes: {
    customersCount: Schema.Attribute.Integer;
    fiveStarReviewsCount: Schema.Attribute.Integer;
    newsletterDiscountPercentage: Schema.Attribute.Integer;
  };
}

export interface GlobalSeo extends Struct.ComponentSchema {
  collectionName: 'components_global_seos';
  info: {
    displayName: 'SEO';
  };
  attributes: {
    defaultDescription: Schema.Attribute.Text;
    defaultTitle: Schema.Attribute.String;
    titleSeparator: Schema.Attribute.String;
    titleSuffix: Schema.Attribute.String;
  };
}

export interface LocationAbout extends Struct.ComponentSchema {
  collectionName: 'components_location_abouts';
  info: {
    displayName: 'About';
  };
  attributes: {
    comingSoon: Schema.Attribute.Component<'location.about-item', false>;
    open: Schema.Attribute.Component<'location.about-item', false>;
    openSoon: Schema.Attribute.Component<'location.about-item', false>;
  };
}

export interface LocationAboutItem extends Struct.ComponentSchema {
  collectionName: 'components_location_about_items';
  info: {
    displayName: 'About Item';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    media: Schema.Attribute.Media<'images' | 'videos'>;
  };
}

export interface LocationContact extends Struct.ComponentSchema {
  collectionName: 'components_location_contacts';
  info: {
    displayName: 'Contact';
  };
  attributes: {
    phoneNumber: Schema.Attribute.String;
    whatsAppNumber: Schema.Attribute.String;
  };
}

export interface ProductVariant extends Struct.ComponentSchema {
  collectionName: 'components_product_variants';
  info: {
    displayName: 'Variant';
  };
  attributes: {
    costPerItemInEuroCent: Schema.Attribute.Integer &
      Schema.Attribute.CustomField<'plugin::amount-cents.price'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    description: Schema.Attribute.Blocks;
    images: Schema.Attribute.Media<'images', true>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    priceInEuroCent: Schema.Attribute.Integer &
      Schema.Attribute.CustomField<'plugin::amount-cents.price'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    slug: Schema.Attribute.String & Schema.Attribute.Required;
    volume: Schema.Attribute.Component<'product.volume', false>;
  };
}

export interface ProductVolume extends Struct.ComponentSchema {
  collectionName: 'components_product_volumes';
  info: {
    displayName: 'Volume';
  };
  attributes: {
    quantity: Schema.Attribute.Decimal & Schema.Attribute.Required;
    unit: Schema.Attribute.Enumeration<
      ['ie', 'ml', 'ampoule', 'session', 'package']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'ml'>;
  };
}

export interface SharedAddress extends Struct.ComponentSchema {
  collectionName: 'components_shared_addresses';
  info: {
    displayName: 'Address';
    icon: 'house';
  };
  attributes: {
    city: Schema.Attribute.String;
    houseNumber: Schema.Attribute.String;
    postalCode: Schema.Attribute.String;
    street: Schema.Attribute.String;
  };
}

export interface SharedButton extends Struct.ComponentSchema {
  collectionName: 'components_shared_buttons';
  info: {
    displayName: 'Button';
    icon: 'cursor';
  };
  attributes: {
    action: Schema.Attribute.Enumeration<
      ['appointment-booking', 'newsletter-sign-up']
    > &
      Schema.Attribute.DefaultTo<'appointment-booking'>;
    anchor: Schema.Attribute.String;
    collection: Schema.Attribute.Enumeration<
      ['page', 'location', 'treatment', 'product']
    >;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    location: Schema.Attribute.Relation<'oneToOne', 'api::location.location'>;
    method: Schema.Attribute.Enumeration<
      ['action', 'external-link', 'internal-link']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'action'>;
    noFollow: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    openInNewWindow: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    page: Schema.Attribute.Relation<'oneToOne', 'api::page.page'>;
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    singleType: Schema.Attribute.Enumeration<
      [
        'about-us',
        'blog',
        'career',
        'doctors',
        'homepage',
        'prices',
        'locations',
      ]
    > &
      Schema.Attribute.DefaultTo<'homepage'>;
    targetType: Schema.Attribute.Enumeration<['collection', 'single-type']> &
      Schema.Attribute.DefaultTo<'collection'>;
    treatment: Schema.Attribute.Relation<
      'oneToOne',
      'api::treatment-page.treatment-page'
    >;
    url: Schema.Attribute.String;
    variant: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'tertiary', 'quaternary', 'link']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SharedCardDesign extends Struct.ComponentSchema {
  collectionName: 'components_shared_card_designs';
  info: {
    displayName: 'Card Settings';
  };
  attributes: {
    colorTheme: Schema.Attribute.Enumeration<
      ['light', 'soft', 'neutral', 'strong']
    > &
      Schema.Attribute.DefaultTo<'light'>;
    elevation: Schema.Attribute.Enumeration<['small', 'medium', 'large']>;
  };
}

export interface SharedCollabsibleItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_collabsible_items';
  info: {
    displayName: 'Collabsible Item';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    icon: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<
        'plugin::strapi-plugin-iconhub.iconhub',
        {
          storeIconData: true;
          storeIconName: true;
        }
      >;
    isOpenByDefault: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedCoordinates extends Struct.ComponentSchema {
  collectionName: 'components_shared_coordinates';
  info: {
    displayName: 'Coordinates';
  };
  attributes: {
    lat: Schema.Attribute.Float &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 90;
          min: -90;
        },
        number
      >;
    long: Schema.Attribute.Float &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 180;
          min: -180;
        },
        number
      >;
  };
}

export interface SharedHeadingContentItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_heading_content_items';
  info: {
    displayName: 'Heading Content Item';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    heading: Schema.Attribute.String;
  };
}

export interface SharedIconHeadingContent extends Struct.ComponentSchema {
  collectionName: 'components_shared_icon_heading_contents';
  info: {
    displayName: 'Icon Heading Content';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    heading: Schema.Attribute.String;
    icon: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<
        'plugin::strapi-plugin-iconhub.iconhub',
        {
          storeIconData: true;
          storeIconName: true;
        }
      >;
  };
}

export interface SharedIconHeadingText extends Struct.ComponentSchema {
  collectionName: 'components_shared_icon_heading_texts';
  info: {
    displayName: 'Icon Heading Text';
  };
  attributes: {
    heading: Schema.Attribute.String;
    icon: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<
        'plugin::strapi-plugin-iconhub.iconhub',
        {
          storeIconData: true;
          storeIconName: true;
        }
      >;
    text: Schema.Attribute.Text;
  };
}

export interface SharedIconTextPair extends Struct.ComponentSchema {
  collectionName: 'components_shared_icon_text_pairs';
  info: {
    displayName: 'Icon Text Pair';
  };
  attributes: {
    icon: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<
        'plugin::strapi-plugin-iconhub.iconhub',
        {
          storeIconData: true;
          storeIconName: true;
        }
      >;
    text: Schema.Attribute.String;
  };
}

export interface SharedImageHeadingText extends Struct.ComponentSchema {
  collectionName: 'components_shared_image_heading_texts';
  info: {
    displayName: 'Image Heading Text';
  };
  attributes: {
    heading: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    text: Schema.Attribute.Text;
  };
}

export interface SharedKeyValue extends Struct.ComponentSchema {
  collectionName: 'components_shared_key_values';
  info: {
    displayName: 'Key Value';
  };
  attributes: {
    key: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

export interface SharedOpenGraph extends Struct.ComponentSchema {
  collectionName: 'components_shared_open_graphs';
  info: {
    displayName: 'Open Graph';
    icon: 'project-diagram';
  };
  attributes: {
    ogDescription: Schema.Attribute.String;
    ogImage: Schema.Attribute.Media<'images'>;
    ogTitle: Schema.Attribute.String;
  };
}

export interface SharedOpeningHours extends Struct.ComponentSchema {
  collectionName: 'components_shared_opening_hours';
  info: {
    displayName: 'Opening Hours';
  };
  attributes: {
    exceptions: Schema.Attribute.Component<
      'shared.opening-hours-exceptions',
      true
    >;
    week: Schema.Attribute.Component<'shared.opening-hours-day', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 7;
        },
        number
      >;
  };
}

export interface SharedOpeningHoursDay extends Struct.ComponentSchema {
  collectionName: 'components_shared_opening_hours_days';
  info: {
    displayName: 'Opening Hours Day';
  };
  attributes: {
    closed: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    day: Schema.Attribute.Enumeration<
      [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
    > &
      Schema.Attribute.Required;
    intervals: Schema.Attribute.Component<
      'shared.opening-hours-interval',
      true
    >;
  };
}

export interface SharedOpeningHoursExceptions extends Struct.ComponentSchema {
  collectionName: 'components_shared_opening_hours_exceptions';
  info: {
    displayName: 'Opening Hours Exceptions';
  };
  attributes: {
    closedAllDay: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    date: Schema.Attribute.Date &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    intervals: Schema.Attribute.Component<
      'shared.opening-hours-interval',
      true
    >;
    note: Schema.Attribute.String;
  };
}

export interface SharedOpeningHoursInterval extends Struct.ComponentSchema {
  collectionName: 'components_shared_opening_hours_intervals';
  info: {
    displayName: 'Opening Hours Interval';
  };
  attributes: {
    closes: Schema.Attribute.String & Schema.Attribute.Required;
    opens: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'opens'>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    keywords: Schema.Attribute.Text;
    metaDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaRobots: Schema.Attribute.String;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    openGraph: Schema.Attribute.Component<'shared.open-graph', false>;
  };
}

export interface SharedVideoSettings extends Struct.ComponentSchema {
  collectionName: 'components_shared_video_settings';
  info: {
    displayName: 'Video Settings';
  };
  attributes: {
    autoplay: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    playsInline: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    preload: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface TreatmentPageAbout extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_abouts';
  info: {
    displayName: 'About';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    media: Schema.Attribute.Media<'images' | 'videos'>;
  };
}

export interface TreatmentPageBenefits extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_benefits';
  info: {
    displayName: 'Benefits';
    icon: 'check';
  };
  attributes: {
    headline: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.heading-content-item', true>;
    media: Schema.Attribute.Media<'images' | 'videos'>;
  };
}

export interface TreatmentPageFaq extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_faqs';
  info: {
    displayName: 'FAQ';
  };
  attributes: {
    faqs: Schema.Attribute.Relation<'oneToMany', 'api::faq.faq'>;
    headline: Schema.Attribute.String;
  };
}

export interface TreatmentPageHero extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_heroes';
  info: {
    displayName: 'Hero';
  };
  attributes: {
    cover: Schema.Attribute.Media<'images'>;
    headline: Schema.Attribute.String;
    headlineSuffix: Schema.Attribute.String;
    showDiscount: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    showPrice: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    subline: Schema.Attribute.String;
    text: Schema.Attribute.Text;
  };
}

export interface TreatmentPageMedicalTeamHighlight
  extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_medical_team_highlights';
  info: {
    displayName: 'Medical Team Highlight';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    employee: Schema.Attribute.Relation<'oneToOne', 'api::employee.employee'>;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
  };
}

export interface TreatmentPageRelatedServices extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_related_services';
  info: {
    displayName: 'Related Services';
  };
  attributes: {
    headline: Schema.Attribute.String;
    treatmentPages: Schema.Attribute.Relation<
      'oneToMany',
      'api::treatment-page.treatment-page'
    >;
  };
}

export interface TreatmentPageReviews extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_reviews';
  info: {
    displayName: 'Reviews';
  };
  attributes: {
    headline: Schema.Attribute.String;
    reviews: Schema.Attribute.Relation<'oneToMany', 'api::review.review'>;
  };
}

export interface TreatmentPageSuitability extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_suitabilities';
  info: {
    displayName: 'Suitability';
  };
  attributes: {
    notSuitableFor: Schema.Attribute.Component<
      'shared.heading-content-item',
      false
    >;
    suitableFor: Schema.Attribute.Component<
      'shared.heading-content-item',
      false
    >;
  };
}

export interface TreatmentPageTableOfContents extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_table_of_contents';
  info: {
    displayName: 'Table Of Contents';
    icon: 'bulletList';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
  };
}

export interface TreatmentPageTeaser extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_teasers';
  info: {
    displayName: 'Teaser';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    shortDescription: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface TreatmentPageTreatmentDetails extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_treatment_details';
  info: {
    displayName: 'Treatment Details';
  };
  attributes: {
    aftercareSummary: Schema.Attribute.Text;
    anesthesia: Schema.Attribute.Text;
    duration: Schema.Attribute.Text;
    effect: Schema.Attribute.Text;
    effectDuration: Schema.Attribute.Text;
    finalResults: Schema.Attribute.Text;
    followUpTreatments: Schema.Attribute.Text;
    headline: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    initialResults: Schema.Attribute.Text;
    medication: Schema.Attribute.Text;
    price: Schema.Attribute.Text;
  };
}

export interface TreatmentPageTreatmentPlan extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_treatment_plans';
  info: {
    displayName: 'Treatment Plan';
  };
  attributes: {
    additionalInfos: Schema.Attribute.Component<
      'shared.collabsible-item',
      true
    >;
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    personaAge: Schema.Attribute.Integer;
    personaPhoto: Schema.Attribute.Media<'images'>;
    personaTreatmentGoal: Schema.Attribute.Text;
    steps: Schema.Attribute.Component<
      'treatment-plan.treatment-plan-step',
      true
    >;
  };
}

export interface TreatmentPageTreatmentProcess extends Struct.ComponentSchema {
  collectionName: 'components_treatment_page_treatment_processes';
  info: {
    displayName: 'Treatment Process';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    headline: Schema.Attribute.String;
    steps: Schema.Attribute.Component<'shared.image-heading-text', true>;
  };
}

export interface TreatmentPlanTreatmentPlanStep extends Struct.ComponentSchema {
  collectionName: 'components_treatment_plan_treatment_plan_steps';
  info: {
    displayName: 'Step';
  };
  attributes: {
    description: Schema.Attribute.Text;
    endOfPlanText: Schema.Attribute.String;
    followUpPlanText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Behandlung wiederholen'>;
    treatments: Schema.Attribute.Relation<
      'oneToMany',
      'api::treatment.treatment'
    >;
    type: Schema.Attribute.Enumeration<
      ['step', 'end-of-plan', 'follow-up-plan']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'step'>;
    week: Schema.Attribute.Integer &
      Schema.Attribute.Unique &
      Schema.Attribute.DefaultTo<1>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.benefits-list': BlocksBenefitsList;
      'blocks.comparison-block': BlocksComparisonBlock;
      'blocks.directions': BlocksDirections;
      'blocks.employee': BlocksEmployee;
      'blocks.employee-list': BlocksEmployeeList;
      'blocks.faq': BlocksFaq;
      'blocks.highlights-strip': BlocksHighlightsStrip;
      'blocks.location-map': BlocksLocationMap;
      'blocks.media-bento': BlocksMediaBento;
      'blocks.media-card': BlocksMediaCard;
      'blocks.page-header': BlocksPageHeader;
      'blocks.process-steps': BlocksProcessSteps;
      'blocks.product-category-price-overview': BlocksProductCategoryPriceOverview;
      'blocks.reviews': BlocksReviews;
      'blocks.stories': BlocksStories;
      'blocks.table-of-contents': BlocksTableOfContents;
      'blocks.text-content': BlocksTextContent;
      'blocks.treatment-details': BlocksTreatmentDetails;
      'blocks.treatment-hero': BlocksTreatmentHero;
      'blocks.treatment-plan': BlocksTreatmentPlan;
      'blocks.treatment-teasers': BlocksTreatmentTeasers;
      'blocks.trust-grid': BlocksTrustGrid;
      'blog.call-to-action': BlogCallToAction;
      'blog.callout': BlogCallout;
      'blog.cta': BlogCta;
      'blog.image': BlogImage;
      'blog.newsletter': BlogNewsletter;
      'blog.text': BlogText;
      'career-page.job-teasers': CareerPageJobTeasers;
      'employee.qualification-group': EmployeeQualificationGroup;
      'employee.text-item': EmployeeTextItem;
      'employee.vita-entry': EmployeeVitaEntry;
      'global.brand': GlobalBrand;
      'global.marketing': GlobalMarketing;
      'global.seo': GlobalSeo;
      'location.about': LocationAbout;
      'location.about-item': LocationAboutItem;
      'location.contact': LocationContact;
      'product.variant': ProductVariant;
      'product.volume': ProductVolume;
      'shared.address': SharedAddress;
      'shared.button': SharedButton;
      'shared.card-design': SharedCardDesign;
      'shared.collabsible-item': SharedCollabsibleItem;
      'shared.coordinates': SharedCoordinates;
      'shared.heading-content-item': SharedHeadingContentItem;
      'shared.icon-heading-content': SharedIconHeadingContent;
      'shared.icon-heading-text': SharedIconHeadingText;
      'shared.icon-text-pair': SharedIconTextPair;
      'shared.image-heading-text': SharedImageHeadingText;
      'shared.key-value': SharedKeyValue;
      'shared.open-graph': SharedOpenGraph;
      'shared.opening-hours': SharedOpeningHours;
      'shared.opening-hours-day': SharedOpeningHoursDay;
      'shared.opening-hours-exceptions': SharedOpeningHoursExceptions;
      'shared.opening-hours-interval': SharedOpeningHoursInterval;
      'shared.seo': SharedSeo;
      'shared.video-settings': SharedVideoSettings;
      'treatment-page.about': TreatmentPageAbout;
      'treatment-page.benefits': TreatmentPageBenefits;
      'treatment-page.faq': TreatmentPageFaq;
      'treatment-page.hero': TreatmentPageHero;
      'treatment-page.medical-team-highlight': TreatmentPageMedicalTeamHighlight;
      'treatment-page.related-services': TreatmentPageRelatedServices;
      'treatment-page.reviews': TreatmentPageReviews;
      'treatment-page.suitability': TreatmentPageSuitability;
      'treatment-page.table-of-contents': TreatmentPageTableOfContents;
      'treatment-page.teaser': TreatmentPageTeaser;
      'treatment-page.treatment-details': TreatmentPageTreatmentDetails;
      'treatment-page.treatment-plan': TreatmentPageTreatmentPlan;
      'treatment-page.treatment-process': TreatmentPageTreatmentProcess;
      'treatment-plan.treatment-plan-step': TreatmentPlanTreatmentPlanStep;
    }
  }
}
