export const mediaPopulate = {
  fields: ["mime", "url", "formats", "width", "height", "alternativeText"],
} as const;

export const mediaLightPopulate = {
  fields: ["url"],
} as const;
