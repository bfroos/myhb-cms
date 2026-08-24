export const mediaPopulate = {
  fields: ["mime", "url", "width", "height", "alternativeText"],
} as const;

export const mediaWithDatePopulate = {
  fields: ["mime", "url", "width", "height", "alternativeText", "createdAt"],
} as const;

export const mediaLightPopulate = {
  fields: ["url"],
} as const;
